import { EventBus } from "@visitor-analytics-sdk/utils";
import {
  type AnalyticsConfig,
  type AnalyticsConfigPartial,
  type AnalyticsRecord,
  type Collector,
  type CollectorContext,
  type Plugin,
  type PluginContext,
  type AnalyticsEvent,
  type VisitorAnalyticsInstance,
  type StorageAdapter,
  type AnalyticsQuery,
} from "./types";
import { PluginManager, createPluginContext } from "@visitor-analytics-sdk/plugins";
import { Uploader } from "@visitor-analytics-sdk/uploader";
import { StorageAdapterFactory } from "@visitor-analytics-sdk/storage";
import { generateId, isBrowser, requestIdle, SDK_VERSION, deepFreeze, detectBestStorage } from "@visitor-analytics-sdk/utils";
import {
  BrowserCollector,
  DeviceCollector,
  PerformanceCollector,
  EnvironmentCollector,
  FeatureCollector,
  InteractionCollector,
} from "@visitor-analytics-sdk/collectors";

const DEFAULT_CONFIG: AnalyticsConfig = {
  endpoint: "",
  // H5: Auto-detect best storage instead of defaulting to memory
  storage: "indexeddb" as const,
  autoStart: true,
  batchSize: 50,
  flushInterval: 30000,
  maxRetries: 5,
  retryBaseDelay: 1000,
  retryMaxDelay: 30000,
  compressionEnabled: false,
  deduplicationEnabled: true,
  headers: {},
  timeout: 10000,
  collectBrowser: true,
  collectDevice: true,
  collectPerformance: true,
  collectEnvironment: true,
  collectFeatures: true,
  collectInteraction: true,
  includeUserAgent: false,
  includeReferrer: true,
  sessionTimeout: 30 * 60 * 1000,
  customData: {},
};

export class VisitorAnalytics implements VisitorAnalyticsInstance {
  private config: AnalyticsConfig;
  private eventBus: EventBus;
  private pluginManager: PluginManager;
  private storage: StorageAdapter;
  private uploader: Uploader;
  private collectors: Collector[] = [];
  private collectorContext: CollectorContext | null = null;
  private isRunning = false;
  private sessionId: string;
  private collectTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: AnalyticsConfigPartial = {}) {
    const merged = { ...DEFAULT_CONFIG, ...config };
    if (config.customData) {
      merged.customData = { ...DEFAULT_CONFIG.customData, ...config.customData };
    }
    if (config.headers) {
      merged.headers = { ...DEFAULT_CONFIG.headers, ...config.headers };
    }
    // H5: Auto-detect storage if user didn't explicitly set it
    if (!config.storage) {
      merged.storage = detectBestStorage();
    }
    this.config = merged;
    this.eventBus = new EventBus();
    this.sessionId = generateId();

    // Storage
    if (typeof this.config.storage === "object" && typeof (this.config.storage as StorageAdapter).save === "function") {
      this.storage = this.config.storage as StorageAdapter;
    } else {
      this.storage = StorageAdapterFactory.create(this.config.storage as "memory" | "localstorage" | "indexeddb");
    }

    // Uploader
    this.uploader = new Uploader(this.storage, {
      endpoint: this.config.endpoint,
      batchSize: this.config.batchSize,
      flushInterval: this.config.flushInterval,
      maxRetries: this.config.maxRetries,
      retryBaseDelay: this.config.retryBaseDelay,
      retryMaxDelay: this.config.retryMaxDelay,
      compressionEnabled: this.config.compressionEnabled,
      deduplicationEnabled: this.config.deduplicationEnabled,
      headers: this.config.headers,
      timeout: this.config.timeout,
    });

    // Plugin manager
    this.pluginManager = new PluginManager(this.eventBus);

    // Register built-in collectors
    this.registerBuiltInCollectors();

    // Auto-start
    if (this.config.autoStart && isBrowser()) {
      requestIdle(() => this.start());
    }
  }

  private registerBuiltInCollectors(): void {
    if (this.config.collectBrowser) {
      this.addCollector(new BrowserCollector({ includeUserAgent: this.config.includeUserAgent }));
    }
    if (this.config.collectDevice) {
      this.addCollector(new DeviceCollector());
    }
    if (this.config.collectPerformance) {
      this.addCollector(new PerformanceCollector());
    }
    if (this.config.collectEnvironment) {
      this.addCollector(new EnvironmentCollector());
    }
    if (this.config.collectFeatures) {
      this.addCollector(new FeatureCollector());
    }
    if (this.config.collectInteraction) {
      this.addCollector(
        new InteractionCollector({ sessionTimeout: this.config.sessionTimeout })
      );
    }
  }

  // C1: Guard buildCollectorContext with isBrowser() - returns null on server
  private buildCollectorContext(): CollectorContext | null {
    if (!isBrowser()) return null;
    if (this.collectorContext) return this.collectorContext;

    const ctx: CollectorContext = {
      document,
      navigator: navigator as unknown as CollectorContext["navigator"],
      window,
      performance,
      location,
      history,
      screen,
    };

    this.collectorContext = ctx;
    return ctx;
  }

  start(): void {
    if (this.isRunning) return;
    // C1: Guard start against SSR
    if (!isBrowser()) return;
    this.isRunning = true;

    this.uploader.start();
    this.eventBus.emit("start");

    // Initialize collectors that have init
    for (const collector of this.collectors) {
      if (collector.init) {
        const ctx = this.buildCollectorContext();
        if (!ctx) continue;
        requestIdle(() => {
          collector.init!(ctx).catch((err) => {
            console.debug("[VisitorAnalytics] Collector init failed:", collector.name, err);
          });
        });
      }
    }

    // Periodic collection only - no flush here (C2 fix)
    this.collectTimer = setInterval(() => {
      requestIdle(() => this.collectAndStore());
    }, this.config.flushInterval);
  }

  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;

    this.uploader.stop();
    if (this.collectTimer !== null) {
      clearInterval(this.collectTimer);
      this.collectTimer = null;
    }

    this.eventBus.emit("stop");
  }

  // C2: flush() should only upload what's already stored, not collect again
  async flush(): Promise<void> {
    await this.uploader.flush();
    this.eventBus.emit("flush");
  }

  // C2: sync() same - only upload, don't re-collect
  async sync(): Promise<void> {
    await this.uploader.sync();
    this.eventBus.emit("sync");
  }

  async retryFailed(): Promise<void> {
    await this.uploader.retryFailed();
  }

  use(plugin: Plugin): void {
    const pluginContext = this.createPluginContext();
    this.pluginManager.install(plugin, pluginContext);
  }

  addCollector(collector: Collector): void {
    // Check for duplicate names
    if (this.collectors.some((c) => c.name === collector.name)) {
      return;
    }
    this.collectors.push(collector);
    this.pluginManager.addCollector(collector);
    this.eventBus.emit("collector-registered", collector.name);
  }

  removeCollector(name: string): void {
    const idx = this.collectors.findIndex((c) => c.name === name);
    if (idx === -1) return;

    const collector = this.collectors[idx];
    if (collector?.destroy) {
      collector.destroy().catch(() => {
        // swallow
      });
    }

    this.collectors.splice(idx, 1);
    this.pluginManager.removeCollector(name);
    this.eventBus.emit("collector-removed", name);
  }

  async getCollectedData(): Promise<readonly AnalyticsRecord[]> {
    return this.storage.load();
  }

  // M2: Query API for filtering records
  async query(query: AnalyticsQuery): Promise<readonly AnalyticsRecord[]> {
    const allRecords = await this.storage.load();
    let result = [...allRecords];

    if (query.since !== undefined) {
      result = result.filter((r) => r.timestamp >= query.since!);
    }
    if (query.until !== undefined) {
      result = result.filter((r) => r.timestamp <= query.until!);
    }
    if (query.pagePath !== undefined) {
      result = result.filter((r) => r.pagePath === query.pagePath);
    }
    if (query.sessionId !== undefined) {
      result = result.filter((r) => r.sessionId === query.sessionId);
    }
    if (query.offset !== undefined) {
      result = result.slice(query.offset);
    }
    if (query.limit !== undefined) {
      result = result.slice(0, query.limit);
    }

    return result;
  }

  async export(): Promise<string> {
    return this.storage.export();
  }

  // H3: Expose trackRouteChange for SPA framework integrations
  trackRouteChange(url: string): void {
    const interactionCollector = this.collectors.find((c) => c.name === "interaction") as InteractionCollector | undefined;
    if (interactionCollector) {
      interactionCollector.trackRouteChange(url);
    }
  }

  on(event: AnalyticsEvent, handler: (...args: readonly unknown[]) => void): void {
    this.eventBus.on(event, handler);
  }

  off(event: AnalyticsEvent, handler: (...args: readonly unknown[]) => void): void {
    this.eventBus.off(event, handler);
  }

  async destroy(): Promise<void> {
    this.stop();

    // Destroy all collectors
    for (const collector of this.collectors) {
      if (collector.destroy) {
        await collector.destroy();
      }
    }

    this.uploader.destroy();
    this.eventBus.removeAllListeners();
    this.collectors = [];
    this.collectorContext = null;
  }

  private async collectAndStore(): Promise<void> {
    if (!isBrowser()) return;

    const context = this.buildCollectorContext();
    if (!context) return; // C1: SSR guard
    const record = await this.collectRecord(context);
    if (record) {
      await this.storage.save(record);
      this.eventBus.emit("record-collected", record);
    }
  }

  private async collectRecord(context: CollectorContext): Promise<AnalyticsRecord | null> {
    const now = Date.now();
    const partials: Partial<AnalyticsRecord>[] = [];

    for (const collector of this.collectors) {
      if (!collector.enabled) continue;
      try {
        const data = await collector.collect(context);
        partials.push(data);
      } catch (err) {
        console.debug("[VisitorAnalytics] Collector collect failed:", collector.name, err);
      }
    }

    if (partials.length === 0) return null;

    // C4: Single deep copy via structuredClone (no more double clone)
    const merged = structuredClone(Object.assign({}, ...partials)) as Partial<AnalyticsRecord>;

    const record: AnalyticsRecord = {
      id: generateId(),
      timestamp: now,
      sessionId: this.sessionId,
      pageUrl: location.href,
      pagePath: location.pathname,
      referrer: this.config.includeReferrer ? document.referrer : "",
      screenWidth: screen.width,
      screenHeight: screen.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
      browser: merged.browser ?? {
        name: "unknown",
        version: "0",
        engine: "unknown",
        engineVersion: "0",
        userAgent: "",
        language: "",
        cookiesEnabled: false,
        javaScriptEnabled: true,
        doNotTrack: null,
      },
      device: merged.device ?? {
        os: "unknown",
        osVersion: "unknown",
        platform: "",
        architecture: "unknown",
        formFactor: "unknown",
        screenWidth: 0,
        screenHeight: 0,
        viewportWidth: 0,
        viewportHeight: 0,
        devicePixelRatio: 1,
        colorDepth: 24,
        orientation: "portrait-primary",
        touchSupport: "none",
        hardwareConcurrency: 0,
        maxTouchPoints: 0,
      },
      performance: merged.performance ?? {
        navigationTiming: null,
        paintTiming: null,
        largestContentfulPaint: null,
        firstContentfulPaint: null,
        cumulativeLayoutShift: null,
        interactionToNextPaint: null,
        deviceMemory: null,
        networkType: "unknown",
        effectiveType: "unknown",
        downlink: null,
        rtt: null,
        saveData: false,
      },
      environment: merged.environment ?? {
        timezone: "UTC",
        timezoneOffset: 0,
        languages: [],
        language: "",
        locale: "",
        prefersColorScheme: "no-preference",
        prefersReducedMotion: false,
        prefersContrast: "no-preference",
        colorGamut: "unknown",
        hdr: false,
        localStorageSupport: false,
        sessionStorageSupport: false,
        indexedDBSupport: false,
        cookieSupport: false,
        cacheAPISupport: false,
      },
      features: merged.features ?? {
        webgl: false,
        webgl2: false,
        webgpu: false,
        wasm: false,
        webrtc: false,
        websockets: false,
        broadcastChannel: false,
        sharedWorker: false,
        serviceWorker: false,
        notifications: false,
        clipboard: false,
        fileSystemAccess: false,
        webShare: false,
        webAuthn: false,
        pushManager: false,
        geolocation: false,
        bluetooth: false,
        usb: false,
        serial: false,
        gamepad: false,
        pictureInPicture: false,
        fullscreen: false,
      },
      interaction: merged.interaction ?? {
        sessionDuration: 0,
        timeOnPage: 0,
        routeChanges: 0,
        scrollDepth: 0,
        clickCount: 0,
        resizeCount: 0,
        visibilityChanges: 0,
        focusChanges: 0,
        landingPage: "",
        exitPage: null,
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
        utmTerm: null,
        utmContent: null,
      },
      metadata: {
        sdkVersion: SDK_VERSION,
        buildTarget: "browser",
        collectorVersion: SDK_VERSION,
        customData: this.config.customData,
      },
    };

    deepFreeze(record);
    return record;
  }

  private createPluginContext(): PluginContext {
    return createPluginContext(
      (c) => this.addCollector(c),
      (name) => this.removeCollector(name),
      this.eventBus,
      () => this.config
    );
  }
}

export function createAnalytics(config?: AnalyticsConfigPartial): VisitorAnalyticsInstance {
  return new VisitorAnalytics(config);
}
