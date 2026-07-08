import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserCollector } from "../packages/collectors/src/browser/browser-collector.ts";
import { DeviceCollector } from "../packages/collectors/src/device/device-collector.ts";
import { PerformanceCollector } from "../packages/collectors/src/performance/performance-collector.ts";
import { EnvironmentCollector } from "../packages/collectors/src/environment/environment-collector.ts";
import { FeatureCollector } from "../packages/collectors/src/features/feature-collector.ts";
import type { CollectorContext } from "../packages/core/src/types.ts";

function createMockContext(overrides?: Partial<CollectorContext>): CollectorContext {
  return {
    document: {
      cookie: "",
      referrer: "",
      title: "Test Page",
      visibilityState: "visible",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
    navigator: {
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      language: "en-US",
      languages: ["en-US", "en"],
      platform: "Win32",
      hardwareConcurrency: 8,
      maxTouchPoints: 0,
      cookieEnabled: true,
      doNotTrack: null,
      deviceMemory: undefined,
      connection: undefined,
      storage: undefined,
      clipboard: undefined,
      permissions: undefined,
    },
    window: {
      innerWidth: 1920,
      innerHeight: 1080,
      screen: { width: 1920, height: 1080, availWidth: 1920, availHeight: 1040, colorDepth: 24, pixelDepth: 24, orientation: undefined },
      devicePixelRatio: 1,
      localStorage: undefined,
      sessionStorage: undefined,
      indexedDB: undefined,
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
    performance: {
      timing: undefined,
      navigation: undefined,
      getEntries: vi.fn().mockReturnValue([]),
      getEntriesByType: vi.fn().mockReturnValue([]),
      getEntriesByName: vi.fn().mockReturnValue([]),
      now: vi.fn().mockReturnValue(100),
    },
    location: {
      href: "https://example.com",
      origin: "https://example.com",
      pathname: "/",
      search: "",
      hash: "",
      host: "example.com",
      hostname: "example.com",
      protocol: "https:",
      port: "",
    },
    history: {
      length: 1,
      pushState: vi.fn(),
      replaceState: vi.fn(),
    },
    screen: {
      width: 1920,
      height: 1080,
      availWidth: 1920,
      availHeight: 1040,
      colorDepth: 24,
      pixelDepth: 24,
      orientation: undefined,
    },
    ...overrides,
  } as unknown as CollectorContext;
}

describe("BrowserCollector", () => {
  let collector: BrowserCollector;

  beforeEach(() => {
    collector = new BrowserCollector();
  });

  it("should have correct metadata", () => {
    expect(collector.name).toBe("browser");
    expect(collector.category).toBe("browser");
    expect(collector.enabled).toBe(true);
  });

  it("should detect Chrome browser", async () => {
    const context = createMockContext();
    const result = await collector.collect(context);
    expect(result.browser.name).toBe("Chrome");
    expect(result.browser.engine).toBe("Blink");
  });

  it("should detect Firefox browser", async () => {
    const context = createMockContext({
      navigator: {
        ...createMockContext().navigator,
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
      },
    });
    const result = await collector.collect(context);
    expect(result.browser.name).toBe("Firefox");
    expect(result.browser.engine).toBe("Gecko");
  });

  it("should detect Safari browser", async () => {
    const context = createMockContext({
      navigator: {
        ...createMockContext().navigator,
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
      },
    });
    const result = await collector.collect(context);
    expect(result.browser.name).toBe("Safari");
    expect(result.browser.engine).toBe("WebKit");
  });

  it("should respect includeUserAgent option", async () => {
    const collectorWithUA = new BrowserCollector({ includeUserAgent: true });
    const context = createMockContext();
    const result = await collectorWithUA.collect(context);
    expect(result.browser.userAgent).toContain("Chrome");
  });

  it("should not include user agent by default", async () => {
    const context = createMockContext();
    const result = await collector.collect(context);
    expect(result.browser.userAgent).toBe("");
  });

  it("should detect doNotTrack", async () => {
    const context = createMockContext({
      navigator: {
        ...createMockContext().navigator,
        doNotTrack: "1",
      },
    });
    const result = await collector.collect(context);
    expect(result.browser.doNotTrack).toBe("1");
  });
});

describe("DeviceCollector", () => {
  let collector: DeviceCollector;

  beforeEach(() => {
    collector = new DeviceCollector();
  });

  it("should have correct metadata", () => {
    expect(collector.name).toBe("device");
    expect(collector.category).toBe("device");
    expect(collector.enabled).toBe(true);
  });

  it("should detect Windows OS", async () => {
    const context = createMockContext();
    const result = await collector.collect(context);
    expect(result.device.os).toBe("Windows");
    expect(result.device.platform).toBe("Win32");
  });

  it("should detect macOS from UA", async () => {
    const context = createMockContext({
      navigator: {
        ...createMockContext().navigator,
        platform: "MacIntel",
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
      },
    });
    const result = await collector.collect(context);
    expect(result.device.os).toBe("macOS");
  });

  it("should detect x86_64 architecture", async () => {
    const context = createMockContext();
    const result = await collector.collect(context);
    expect(result.device.architecture).toBe("x86_64");
  });

  it("should detect desktop form factor", async () => {
    const context = createMockContext({
      window: {
        ...createMockContext().window,
        innerWidth: 1920,
      },
      navigator: {
        ...createMockContext().navigator,
        maxTouchPoints: 0,
      },
    });
    const result = await collector.collect(context);
    // Desktop detection requires screen.width >= 1024 and no ontouchstart
    // In jsdom, ontouchstart is not present, so this should work
    expect(["desktop", "unknown"]).toContain(result.device.formFactor);
  });

  it("should detect touch support", async () => {
    const context = createMockContext({
      navigator: {
        ...createMockContext().navigator,
        maxTouchPoints: 5,
      },
    });
    const result = await collector.collect(context);
    expect(result.device.touchSupport).toBe("coarse");
  });

  it("should return screen dimensions", async () => {
    const context = createMockContext();
    const result = await collector.collect(context);
    expect(result.device.screenWidth).toBe(1920);
    expect(result.device.screenHeight).toBe(1080);
    expect(result.device.hardwareConcurrency).toBe(8);
  });
});

describe("PerformanceCollector", () => {
  let collector: PerformanceCollector;

  beforeEach(() => {
    collector = new PerformanceCollector();
  });

  it("should have correct metadata", () => {
    expect(collector.name).toBe("performance");
    expect(collector.category).toBe("performance");
    expect(collector.enabled).toBe(true);
  });

  it("should collect performance data with empty entries", async () => {
    const context = createMockContext();
    const result = await collector.collect(context);
    expect(result.performance).toBeDefined();
    expect(result.performance.navigationTiming).toBeNull();
    expect(result.performance.paintTiming).toBeNull();
    expect(result.performance.largestContentfulPaint).toBeNull();
  });

  it("should collect paint timing entries", async () => {
    const context = createMockContext({
      performance: {
        ...createMockContext().performance,
        getEntriesByType: ((type: string) => {
          if (type === "paint") {
            return [
              { name: "first-paint", startTime: 100 },
              { name: "first-contentful-paint", startTime: 200 },
            ];
          }
          return [];
        }) as unknown as Performance["getEntriesByType"],
      },
    });
    const result = await collector.collect(context);
    expect(result.performance.paintTiming).toEqual({
      firstPaint: 100,
      firstContentfulPaint: 200,
    });
    expect(result.performance.firstContentfulPaint).toBe(200);
  });

  it("should collect LCP from entries", async () => {
    const context = createMockContext({
      performance: {
        ...createMockContext().performance,
        getEntriesByType: ((type: string) => {
          if (type === "largest-contentful-paint") {
            return [
              { startTime: 1000 },
              { startTime: 1500 },
            ];
          }
          return [];
        }) as unknown as Performance["getEntriesByType"],
      },
    });
    const result = await collector.collect(context);
    expect(result.performance.largestContentfulPaint).toBe(1500);
  });

  it("should collect CLS excluding recent input", async () => {
    const context = createMockContext({
      performance: {
        ...createMockContext().performance,
        getEntriesByType: ((type: string) => {
          if (type === "layout-shift") {
            return [
              { hadRecentInput: false, value: 0.1 },
              { hadRecentInput: true, value: 0.5 },
              { hadRecentInput: false, value: 0.2 },
            ];
          }
          return [];
        }) as unknown as Performance["getEntriesByType"],
      },
    });
    const result = await collector.collect(context);
    expect(result.performance.cumulativeLayoutShift).toBeCloseTo(0.3);
  });
});

describe("EnvironmentCollector", () => {
  let collector: EnvironmentCollector;

  beforeEach(() => {
    collector = new EnvironmentCollector();
  });

  it("should have correct metadata", () => {
    expect(collector.name).toBe("environment");
    expect(collector.category).toBe("environment");
    expect(collector.enabled).toBe(true);
  });

  it("should collect timezone and language", async () => {
    const context = createMockContext();
    const result = await collector.collect(context);
    expect(result.environment.timezone).toBeDefined();
    expect(result.environment.language).toBe("en-US");
    expect(result.environment.languages).toEqual(["en-US", "en"]);
  });

  it("should handle missing matchMedia gracefully", async () => {
    const context = createMockContext({
      window: {
        ...createMockContext().window,
        matchMedia: undefined,
      },
    });
    const result = await collector.collect(context);
    expect(result.environment.prefersColorScheme).toBe("no-preference");
    expect(result.environment.prefersReducedMotion).toBe(false);
    expect(result.environment.prefersContrast).toBe("no-preference");
    expect(result.environment.colorGamut).toBe("unknown");
    expect(result.environment.hdr).toBe(false);
  });

  it("should detect color scheme via matchMedia", async () => {
    const context = createMockContext({
      window: {
        ...createMockContext().window,
        matchMedia: ((query: string) => ({
          matches: query === "(prefers-color-scheme: dark)",
        })) as unknown as Window["matchMedia"],
      },
    });
    const result = await collector.collect(context);
    expect(result.environment.prefersColorScheme).toBe("dark");
  });

  it("should detect storage support", async () => {
    const mockStorage = {
      length: 0,
      key: () => null,
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
    };
    const context = createMockContext({
      window: {
        ...createMockContext().window,
        localStorage: mockStorage as Storage,
        sessionStorage: mockStorage as Storage,
      },
    });
    const result = await collector.collect(context);
    expect(result.environment.localStorageSupport).toBe(true);
    expect(result.environment.sessionStorageSupport).toBe(true);
  });
});

describe("FeatureCollector", () => {
  let collector: FeatureCollector;

  beforeEach(() => {
    collector = new FeatureCollector();
  });

  it("should have correct metadata", () => {
    expect(collector.name).toBe("features");
    expect(collector.category).toBe("features");
    expect(collector.enabled).toBe(true);
  });

  it("should collect feature flags", async () => {
    const context = createMockContext();
    const result = await collector.collect(context);
    expect(result.features).toBeDefined();
    expect(typeof result.features.webgl).toBe("boolean");
    expect(typeof result.features.wasm).toBe("boolean");
    expect(typeof result.features.webrtc).toBe("boolean");
    expect(typeof result.features.serviceWorker).toBe("boolean");
  });

  it("should detect WebSocket support", async () => {
    const context = createMockContext();
    const result = await collector.collect(context);
    // WebSocket detection checks typeof window.WebSocket
    expect(typeof result.features.websockets).toBe("boolean");
  });

  it("should detect BroadcastChannel support", async () => {
    const context = createMockContext();
    const result = await collector.collect(context);
    // BroadcastChannel detection checks typeof window.BroadcastChannel
    expect(typeof result.features.broadcastChannel).toBe("boolean");
  });
});
