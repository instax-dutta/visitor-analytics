import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryStorage } from "../packages/storage/src/memory-storage.ts";
import type { AnalyticsRecord } from "../packages/core/src/types.ts";

function createMockRecord(id: string): AnalyticsRecord {
  return {
    id,
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
    browser: {
      name: "Chrome",
      version: "120.0",
      engine: "Blink",
      engineVersion: "120.0",
      userAgent: "Mozilla/5.0",
      language: "en-US",
      cookiesEnabled: true,
      javaScriptEnabled: true,
      doNotTrack: null,
    },
    device: {
      os: "Windows",
      osVersion: "10/11",
      platform: "Win32",
      architecture: "x86_64",
      formFactor: "desktop",
      screenWidth: 1920,
      screenHeight: 1080,
      viewportWidth: 1920,
      viewportHeight: 1080,
      devicePixelRatio: 1,
      colorDepth: 24,
      orientation: "landscape-primary",
      touchSupport: "none",
      hardwareConcurrency: 8,
      maxTouchPoints: 0,
    },
    performance: {
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
    environment: {
      timezone: "UTC",
      timezoneOffset: 0,
      languages: ["en-US"],
      language: "en-US",
      locale: "en-US",
      prefersColorScheme: "light",
      prefersReducedMotion: false,
      prefersContrast: "no-preference",
      colorGamut: "srgb",
      hdr: false,
      localStorageSupport: true,
      sessionStorageSupport: true,
      indexedDBSupport: true,
      cookieSupport: true,
      cacheAPISupport: true,
    },
    features: {
      webgl: true,
      webgl2: true,
      webgpu: false,
      wasm: true,
      webrtc: true,
      websockets: true,
      broadcastChannel: true,
      sharedWorker: false,
      serviceWorker: true,
      notifications: true,
      clipboard: true,
      fileSystemAccess: false,
      webShare: true,
      webAuthn: false,
      pushManager: true,
      geolocation: true,
      bluetooth: false,
      usb: false,
      serial: false,
      gamepad: true,
      pictureInPicture: true,
      fullscreen: true,
    },
    interaction: {
      sessionDuration: 0,
      timeOnPage: 0,
      routeChanges: 0,
      scrollDepth: 0,
      clickCount: 0,
      resizeCount: 0,
      visibilityChanges: 0,
      focusChanges: 0,
      landingPage: "https://example.com",
      exitPage: null,
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      utmTerm: null,
      utmContent: null,
    },
    metadata: {
      sdkVersion: "1.0.0",
      buildTarget: "browser",
      collectorVersion: "1.0.0",
      customData: {},
    },
  };
}

describe("MemoryStorage", () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it("should save and load records", async () => {
    const record = createMockRecord("1");
    await storage.save(record);
    const loaded = await storage.load();
    expect(loaded).toHaveLength(1);
    expect(loaded[0]!.id).toBe("1");
  });

  it("should save batch of records", async () => {
    const records = [createMockRecord("1"), createMockRecord("2"), createMockRecord("3")];
    await storage.saveBatch(records);
    const loaded = await storage.load();
    expect(loaded).toHaveLength(3);
  });

  it("should load batch with limit", async () => {
    const records = [createMockRecord("1"), createMockRecord("2"), createMockRecord("3")];
    await storage.saveBatch(records);
    const batch = await storage.loadBatch(2);
    expect(batch).toHaveLength(2);
    const remaining = await storage.load();
    expect(remaining).toHaveLength(1);
  });

  it("should remove records by id", async () => {
    const records = [createMockRecord("1"), createMockRecord("2"), createMockRecord("3")];
    await storage.saveBatch(records);
    await storage.remove(["1", "3"]);
    const loaded = await storage.load();
    expect(loaded).toHaveLength(1);
    expect(loaded[0]!.id).toBe("2");
  });

  it("should count records", async () => {
    expect(await storage.count()).toBe(0);
    await storage.save(createMockRecord("1"));
    expect(await storage.count()).toBe(1);
    await storage.save(createMockRecord("2"));
    expect(await storage.count()).toBe(2);
  });

  it("should clear all records", async () => {
    await storage.saveBatch([createMockRecord("1"), createMockRecord("2")]);
    await storage.clear();
    expect(await storage.count()).toBe(0);
  });

  it("should export as JSON string", async () => {
    await storage.save(createMockRecord("1"));
    const exported = await storage.export();
    const parsed = JSON.parse(exported);
    expect(parsed).toHaveLength(1);
  });

  it("should return deep copies to prevent external mutation", async () => {
    const record = createMockRecord("1");
    await storage.save(record);
    const loaded = await storage.load();
    (loaded[0] as unknown as { id: string }).id = "mutated";
    const loadedAgain = await storage.load();
    expect(loadedAgain[0]!.id).toBe("1");
  });
});
