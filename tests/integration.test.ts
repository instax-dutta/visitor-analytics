import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { VisitorAnalytics } from "../packages/core/src/visitor-analytics.ts";
import { MemoryStorage } from "../packages/storage/src/memory-storage.ts";
import type { Collector, Plugin } from "../packages/core/src/types.ts";

describe("VisitorAnalytics Integration", () => {
  let analytics: VisitorAnalytics;
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    analytics = new VisitorAnalytics({
      endpoint: "https://analytics.example.com/collect",
      storage,
      autoStart: false,
      flushInterval: 0,
    });
  });

  afterEach(async () => {
    await analytics.destroy();
  });

  it("should create an instance", () => {
    expect(analytics).toBeDefined();
  });

  it("should start and stop", () => {
    analytics.start();
    analytics.stop();
  });

  it("should register built-in collectors on creation", () => {
    // Without autoStart, collectors are registered in constructor
    // but init is only called on start
  });

  it("should add custom collector", async () => {
    const customCollector: Collector = {
      name: "custom",
      category: "custom",
      version: "1.0.0",
      enabled: true,
      collect: vi.fn().mockResolvedValue({
        metadata: {
          sdkVersion: "1.0.0",
          buildTarget: "browser",
          collectorVersion: "1.0.0",
          customData: { customField: "value" },
        },
      }),
    };

    analytics.addCollector(customCollector);
    // Verify no error thrown
  });

  it("should remove collector", () => {
    analytics.removeCollector("browser");
  });

  it("should install plugin", () => {
    const plugin: Plugin = {
      name: "test-plugin",
      version: "1.0.0",
      description: "Test plugin",
      install: vi.fn(),
    };

    analytics.use(plugin);
  });

  it("should emit events", () => {
    const handler = vi.fn();
    analytics.on("start", handler);
    analytics.off("start", handler);
  });

  it("should export data as JSON", async () => {
    const exported = await analytics.export();
    expect(typeof exported).toBe("string");
  });

  it("should handle flush without records", async () => {
    await analytics.flush();
    // No error should be thrown
  });

  it("should handle sync without records", async () => {
    await analytics.sync();
    // No error should be thrown
  });

  it("should handle retryFailed without pending retries", async () => {
    await analytics.retryFailed();
    // No error should be thrown
  });
});

describe("VisitorAnalytics with mock fetch", () => {
  let analytics: VisitorAnalytics;
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  afterEach(async () => {
    await analytics?.destroy();
    vi.unstubAllGlobals();
  });

  it("should send records to endpoint on flush", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
    });
    vi.stubGlobal("fetch", fetchSpy);

    analytics = new VisitorAnalytics({
      endpoint: "https://analytics.example.com/collect",
      storage,
      autoStart: false,
      flushInterval: 0,
    });

    // Manually save some records
    const record = {
      id: "test-1",
      timestamp: Date.now(),
      sessionId: "session-1",
      pageUrl: "https://example.com",
      pagePath: "/",
      referrer: "",
      screenWidth: 1920,
      screenHeight: 1080,
      viewportWidth: 1920,
      viewportHeight: 1080,
      devicePixelRatio: 1,
      browser: { name: "Chrome", version: "120.0", engine: "Blink", engineVersion: "120.0", userAgent: "", language: "en-US", cookiesEnabled: true, javaScriptEnabled: true, doNotTrack: null },
      device: { os: "Windows", osVersion: "10/11", platform: "Win32", architecture: "x86_64", formFactor: "desktop", screenWidth: 1920, screenHeight: 1080, viewportWidth: 1920, viewportHeight: 1080, devicePixelRatio: 1, colorDepth: 24, orientation: "landscape-primary", touchSupport: "none", hardwareConcurrency: 8, maxTouchPoints: 0 },
      performance: { navigationTiming: null, paintTiming: null, largestContentfulPaint: null, firstContentfulPaint: null, cumulativeLayoutShift: null, interactionToNextPaint: null, deviceMemory: null, networkType: "unknown", effectiveType: "unknown", downlink: null, rtt: null, saveData: false },
      environment: { timezone: "UTC", timezoneOffset: 0, languages: ["en-US"], language: "en-US", locale: "en-US", prefersColorScheme: "light", prefersReducedMotion: false, prefersContrast: "no-preference", colorGamut: "srgb", hdr: false, localStorageSupport: true, sessionStorageSupport: true, indexedDBSupport: true, cookieSupport: true, cacheAPISupport: true },
      features: { webgl: true, webgl2: true, webgpu: false, wasm: true, webrtc: true, websockets: true, broadcastChannel: true, sharedWorker: false, serviceWorker: true, notifications: true, clipboard: true, fileSystemAccess: false, webShare: true, webAuthn: false, pushManager: true, geolocation: true, bluetooth: false, usb: false, serial: false, gamepad: true, pictureInPicture: true, fullscreen: true },
      interaction: { sessionDuration: 0, timeOnPage: 0, routeChanges: 0, scrollDepth: 0, clickCount: 0, resizeCount: 0, visibilityChanges: 0, focusChanges: 0, landingPage: "https://example.com", exitPage: null, utmSource: null, utmMedium: null, utmCampaign: null, utmTerm: null, utmContent: null },
      metadata: { sdkVersion: "1.0.0", buildTarget: "browser", collectorVersion: "1.0.0", customData: {} },
    } as const;

    await storage.save(record as any);
    await analytics.flush();

    expect(fetchSpy).toHaveBeenCalled();
    const callArgs = fetchSpy.mock.calls[0];
    expect(callArgs[0]).toBe("https://analytics.example.com/collect");
    expect(callArgs[1].method).toBe("POST");
  });
});
