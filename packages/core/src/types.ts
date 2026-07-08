// ─── Analytics Record (top-level data envelope) ──────────────────────────────

export interface AnalyticsRecord {
  readonly id: string;
  readonly timestamp: number;
  readonly sessionId: string;
  readonly pageUrl: string;
  readonly pagePath: string;
  readonly referrer: string;
  readonly screenWidth: number;
  readonly screenHeight: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly devicePixelRatio: number;
  readonly browser: BrowserData;
  readonly device: DeviceData;
  readonly performance: PerformanceData;
  readonly environment: EnvironmentData;
  readonly features: FeatureData;
  readonly interaction: InteractionData;
  readonly metadata: MetadataData;
}

// ─── Browser Data ────────────────────────────────────────────────────────────

export interface BrowserData {
  readonly name: string;
  readonly version: string;
  readonly engine: string;
  readonly engineVersion: string;
  readonly userAgent: string;
  readonly language: string;
  readonly cookiesEnabled: boolean;
  readonly javaScriptEnabled: boolean;
  readonly doNotTrack: boolean | null;
}

// ─── Device Data ─────────────────────────────────────────────────────────────

export interface DeviceData {
  readonly os: string;
  readonly osVersion: string;
  readonly platform: string;
  readonly architecture: string;
  readonly formFactor: DeviceFormFactor;
  readonly screenWidth: number;
  readonly screenHeight: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly devicePixelRatio: number;
  readonly colorDepth: number;
  readonly orientation: OrientationType;
  readonly touchSupport: TouchSupport;
  readonly hardwareConcurrency: number;
  readonly maxTouchPoints: number;
}

export type DeviceFormFactor =
  | "desktop"
  | "mobile"
  | "tablet"
  | "smarttv"
  | "wearable"
  | "console"
  | "unknown";

export type TouchSupport = "none" | "coarse" | "fine";

// ─── Performance Data ────────────────────────────────────────────────────────

export interface PerformanceData {
  readonly navigationTiming: NavigationTiming | null;
  readonly paintTiming: PaintTiming | null;
  readonly largestContentfulPaint: number | null;
  readonly firstContentfulPaint: number | null;
  readonly cumulativeLayoutShift: number | null;
  readonly interactionToNextPaint: number | null;
  readonly deviceMemory: number | null;
  readonly networkType: string;
  readonly effectiveType: string;
  readonly downlink: number | null;
  readonly rtt: number | null;
  readonly saveData: boolean;
}

export interface NavigationTiming {
  readonly redirectTime: number;
  readonly dnsLookupTime: number;
  readonly tcpConnectTime: number;
  readonly requestTime: number;
  readonly responseTime: number;
  readonly domInteractiveTime: number;
  readonly domContentLoadedTime: number;
  readonly domCompleteTime: number;
  readonly loadTime: number;
  readonly duration: number;
}

export interface PaintTiming {
  readonly firstPaint: number;
  readonly firstContentfulPaint: number;
}

// ─── Environment Data ────────────────────────────────────────────────────────

export interface EnvironmentData {
  readonly timezone: string;
  readonly timezoneOffset: number;
  readonly languages: readonly string[];
  readonly language: string;
  readonly locale: string;
  readonly prefersColorScheme: "light" | "dark" | "no-preference";
  readonly prefersReducedMotion: boolean;
  readonly prefersContrast: "no-preference" | "more" | "less" | "custom";
  readonly colorGamut: "srgb" | "p3" | "rec2020" | "unknown";
  readonly hdr: boolean;
  readonly localStorageSupport: boolean;
  readonly sessionStorageSupport: boolean;
  readonly indexedDBSupport: boolean;
  readonly cookieSupport: boolean;
  readonly cacheAPISupport: boolean;
}

// ─── Feature Data ────────────────────────────────────────────────────────────

export interface FeatureData {
  readonly webgl: boolean;
  readonly webgl2: boolean;
  readonly webgpu: boolean;
  readonly wasm: boolean;
  readonly webrtc: boolean;
  readonly websockets: boolean;
  readonly broadcastChannel: boolean;
  readonly sharedWorker: boolean;
  readonly serviceWorker: boolean;
  readonly notifications: boolean;
  readonly clipboard: boolean;
  readonly fileSystemAccess: boolean;
  readonly webShare: boolean;
  readonly webAuthn: boolean;
  readonly pushManager: boolean;
  readonly geolocation: boolean;
  readonly bluetooth: boolean;
  readonly usb: boolean;
  readonly serial: boolean;
  readonly gamepad: boolean;
  readonly pictureInPicture: boolean;
  readonly fullscreen: boolean;
}

// ─── Interaction Data (aggregate only, no PII) ──────────────────────────────

export interface InteractionData {
  readonly sessionDuration: number;
  readonly timeOnPage: number;
  readonly routeChanges: number;
  readonly scrollDepth: number;
  readonly clickCount: number;
  readonly resizeCount: number;
  readonly visibilityChanges: number;
  readonly focusChanges: number;
  readonly landingPage: string;
  readonly exitPage: string | null;
  readonly utmSource: string | null;
  readonly utmMedium: string | null;
  readonly utmCampaign: string | null;
  readonly utmTerm: string | null;
  readonly utmContent: string | null;
}

// ─── Metadata ────────────────────────────────────────────────────────────────

export interface MetadataData {
  readonly sdkVersion: string;
  readonly buildTarget: string;
  readonly collectorVersion: string;
  readonly customData: Record<string, string | number | boolean>;
}

// ─── Collector Types ─────────────────────────────────────────────────────────

export type CollectorCategory =
  | "browser"
  | "device"
  | "performance"
  | "environment"
  | "features"
  | "interaction"
  | "custom";

export interface Collector {
  readonly name: string;
  readonly category: CollectorCategory;
  readonly version: string;
  enabled: boolean;
  collect(context: CollectorContext): Promise<Partial<AnalyticsRecord>>;
  init?(context: CollectorContext): Promise<void>;
  destroy?(): Promise<void>;
}

export interface CollectorContext {
  readonly document: DocumentLike;
  readonly navigator: NavigatorLike;
  readonly window: WindowLike;
  readonly performance: PerformanceLike;
  readonly location: LocationLike;
  readonly history: HistoryLike;
  readonly screen: ScreenLike;
}

export interface DocumentLike {
  readonly cookie: string;
  readonly referrer: string;
  readonly title: string;
  readonly visibilityState: "visible" | "hidden" | "prerender";
  readonly documentElement: { scrollHeight: number };
  createElement(tagName: string): HTMLElement;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
}

export interface NavigatorLike {
  readonly userAgent: string;
  readonly language: string;
  readonly languages: readonly string[];
  readonly platform: string;
  readonly hardwareConcurrency: number;
  readonly maxTouchPoints: number;
  readonly cookieEnabled: boolean;
  readonly doNotTrack: boolean | null;
  readonly deviceMemory: number | undefined;
  readonly connection: NetworkInformationLike | undefined;
  readonly storage: StorageManagerLike | undefined;
  readonly share?: (data: ShareData) => Promise<void>;
  readonly clipboard: ClipboardLike | undefined;
  readonly permissions: PermissionsLike | undefined;
}

export interface WindowLike {
  readonly innerWidth: number;
  readonly innerHeight: number;
  readonly screen: ScreenLike;
  readonly devicePixelRatio: number;
  readonly localStorage: Storage | undefined;
  readonly sessionStorage: Storage | undefined;
  readonly indexedDB: IDBFactory | undefined;
  matchMedia(query: string): MediaQueryList | null;
  requestIdleCallback?(callback: IdleRequestCallback, options?: IdleRequestOptions): number;
  cancelIdleCallback?(handle: number): void;
  requestAnimationFrame?(callback: FrameRequestCallback): number;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
}

export interface PerformanceLike {
  readonly timing: PerformanceTiming | undefined;
  readonly navigation: PerformanceNavigation | undefined;
  getEntries(): PerformanceEntryList;
  getEntriesByType(name: string): readonly PerformanceEntry[];
  getEntriesByName(name: string): readonly PerformanceEntry[];
  mark?(name: string): void;
  measure?(name: string, startMark?: string, endMark?: string): void;
  clearMarks?(name?: string): void;
  clearMeasures?(name?: string): void;
  now(): number;
}

export interface LocationLike {
  readonly href: string;
  readonly origin: string;
  readonly pathname: string;
  readonly search: string;
  readonly hash: string;
  readonly host: string;
  readonly hostname: string;
  readonly protocol: string;
  readonly port: string;
}

export interface HistoryLike {
  readonly length: number;
  pushState(state: unknown, title: string, url?: string | URL | null): void;
  replaceState(state: unknown, title: string, url?: string | URL | null): void;
}

export interface ScreenLike {
  readonly width: number;
  readonly height: number;
  readonly availWidth: number;
  readonly availHeight: number;
  readonly colorDepth: number;
  readonly pixelDepth: number;
  readonly orientation: ScreenOrientationLike | undefined;
}

export interface ScreenOrientationLike {
  readonly type: OrientationType;
  readonly angle: number;
}

export interface NetworkInformationLike {
  readonly type: string;
  readonly effectiveType: string;
  readonly downlink: number;
  readonly rtt: number;
  readonly saveData: boolean;
}

export interface StorageManagerLike {
  estimate(): Promise<StorageEstimate>;
  persist(): Promise<boolean>;
  persisted(): Promise<boolean>;
}

export interface ClipboardLike {
  readText(): Promise<string>;
  writeText(text: string): Promise<void>;
}

export interface PermissionsLike {
  query(desc: PermissionDesc): Promise<PermissionStatus>;
}

export interface PermissionDesc {
  name: string;
}

// ─── Storage Types ───────────────────────────────────────────────────────────

export type StorageType = "memory" | "localstorage" | "indexeddb" | "custom";

export interface StorageAdapter {
  save(record: AnalyticsRecord): Promise<void>;
  saveBatch(records: readonly AnalyticsRecord[]): Promise<void>;
  load(): Promise<readonly AnalyticsRecord[]>;
  loadBatch(limit: number): Promise<readonly AnalyticsRecord[]>;
  remove(ids: readonly string[]): Promise<void>;
  count(): Promise<number>;
  clear(): Promise<void>;
  export(): Promise<string>;
}

// ─── Uploader Types ──────────────────────────────────────────────────────────

export interface UploaderConfig {
  readonly endpoint: string;
  readonly batchSize: number;
  readonly flushInterval: number;
  readonly maxRetries: number;
  readonly retryBaseDelay: number;
  readonly retryMaxDelay: number;
  readonly compressionEnabled: boolean;
  readonly deduplicationEnabled: boolean;
  readonly headers: Record<string, string>;
  readonly timeout: number;
}

export interface UploadPayload {
  readonly records: readonly AnalyticsRecord[];
  readonly batchId: string;
  readonly timestamp: number;
  readonly sdkVersion: string;
}

export interface UploadResult {
  readonly success: boolean;
  readonly batchId: string;
  readonly statusCode?: number;
  readonly error?: string;
  readonly retryable: boolean;
}

export type UploadEventHandler = (event: UploadEvent) => void;

export interface UploadEvent {
  readonly type: "batch-sent" | "batch-success" | "batch-failed" | "retry-scheduled" | "queue-full";
  readonly batchId: string;
  readonly recordCount: number;
  readonly timestamp: number;
  readonly error?: string;
  readonly retryCount?: number;
  readonly nextRetryAt?: number;
}

// ─── Plugin Types ────────────────────────────────────────────────────────────

export interface Plugin {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  install(analytics: PluginContext): void;
  uninstall?(analytics: PluginContext): void;
}

export interface PluginContext {
  addCollector(collector: Collector): void;
  removeCollector(name: string): void;
  on(event: AnalyticsEvent, handler: (...args: readonly unknown[]) => void): void;
  off(event: AnalyticsEvent, handler: (...args: readonly unknown[]) => void): void;
  getConfig(): AnalyticsConfig;
}

// ─── Analytics Events ────────────────────────────────────────────────────────

export type AnalyticsEvent =
  | "start"
  | "stop"
  | "flush"
  | "sync"
  | "record-collected"
  | "batch-uploaded"
  | "batch-failed"
  | "error"
  | "collector-registered"
  | "collector-removed"
  | "plugin-installed"
  | "plugin-uninstalled"
  | "storage-saved"
  | "storage-loaded"
  | "config-changed";

// ─── Analytics Config ────────────────────────────────────────────────────────

export interface AnalyticsConfig {
  readonly endpoint: string;
  readonly storage: StorageType | StorageAdapter;
  readonly autoStart: boolean;
  readonly batchSize: number;
  readonly flushInterval: number;
  readonly maxRetries: number;
  readonly retryBaseDelay: number;
  readonly retryMaxDelay: number;
  readonly compressionEnabled: boolean;
  readonly deduplicationEnabled: boolean;
  readonly headers: Record<string, string>;
  readonly timeout: number;
  readonly collectBrowser: boolean;
  readonly collectDevice: boolean;
  readonly collectPerformance: boolean;
  readonly collectEnvironment: boolean;
  readonly collectFeatures: boolean;
  readonly collectInteraction: boolean;
  readonly includeUserAgent: boolean;
  readonly includeReferrer: boolean;
  readonly sessionTimeout: number;
  readonly customData: Record<string, string | number | boolean>;
}

export type AnalyticsConfigPartial = Partial<AnalyticsConfig>;

// ─── Factory Types ───────────────────────────────────────────────────────────

export interface VisitorAnalyticsFactory {
  create(config: AnalyticsConfigPartial): VisitorAnalyticsInstance;
}

export interface VisitorAnalyticsInstance {
  start(): void;
  stop(): void;
  flush(): Promise<void>;
  sync(): Promise<void>;
  retryFailed(): Promise<void>;
  use(plugin: Plugin): void;
  addCollector(collector: Collector): void;
  removeCollector(name: string): void;
  getCollectedData(): Promise<readonly AnalyticsRecord[]>;
  export(): Promise<string>;
  on(event: AnalyticsEvent, handler: (...args: readonly unknown[]) => void): void;
  off(event: AnalyticsEvent, handler: (...args: readonly unknown[]) => void): void;
  destroy(): Promise<void>;
}
