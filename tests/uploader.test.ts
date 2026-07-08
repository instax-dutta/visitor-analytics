import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Uploader } from "../packages/uploader/src/uploader.ts";
import { MemoryStorage } from "../packages/storage/src/memory-storage.ts";
import type { AnalyticsRecord, UploadEvent } from "../packages/core/src/types.ts";

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
    browser: { name: "Chrome", version: "120.0", engine: "Blink", engineVersion: "120.0", userAgent: "", language: "en-US", cookiesEnabled: true, javaScriptEnabled: true, doNotTrack: null },
    device: { os: "Windows", osVersion: "10/11", platform: "Win32", architecture: "x86_64", formFactor: "desktop", screenWidth: 1920, screenHeight: 1080, viewportWidth: 1920, viewportHeight: 1080, devicePixelRatio: 1, colorDepth: 24, orientation: "landscape-primary", touchSupport: "none", hardwareConcurrency: 8, maxTouchPoints: 0 },
    performance: { navigationTiming: null, paintTiming: null, largestContentfulPaint: null, firstContentfulPaint: null, cumulativeLayoutShift: null, interactionToNextPaint: null, deviceMemory: null, networkType: "unknown", effectiveType: "unknown", downlink: null, rtt: null, saveData: false },
    environment: { timezone: "UTC", timezoneOffset: 0, languages: ["en-US"], language: "en-US", locale: "en-US", prefersColorScheme: "light", prefersReducedMotion: false, prefersContrast: "no-preference", colorGamut: "srgb", hdr: false, localStorageSupport: true, sessionStorageSupport: true, indexedDBSupport: true, cookieSupport: true, cacheAPISupport: true },
    features: { webgl: true, webgl2: true, webgpu: false, wasm: true, webrtc: true, websockets: true, broadcastChannel: true, sharedWorker: false, serviceWorker: true, notifications: true, clipboard: true, fileSystemAccess: false, webShare: true, webAuthn: false, pushManager: true, geolocation: true, bluetooth: false, usb: false, serial: false, gamepad: true, pictureInPicture: true, fullscreen: true },
    interaction: { sessionDuration: 0, timeOnPage: 0, routeChanges: 0, scrollDepth: 0, clickCount: 0, resizeCount: 0, visibilityChanges: 0, focusChanges: 0, landingPage: "https://example.com", exitPage: null, utmSource: null, utmMedium: null, utmCampaign: null, utmTerm: null, utmContent: null },
    metadata: { sdkVersion: "1.0.0", buildTarget: "browser", collectorVersion: "1.0.0", customData: {} },
  };
}

describe("Uploader", () => {
  let storage: MemoryStorage;
  let uploader: Uploader;

  beforeEach(() => {
    storage = new MemoryStorage();
    uploader = new Uploader(storage, {
      endpoint: "https://analytics.example.com/collect",
      flushInterval: 0,
      maxRetries: 2,
      retryBaseDelay: 10,
      retryMaxDelay: 100,
    });
  });

  afterEach(() => {
    uploader.destroy();
  });

  it("should flush records to endpoint", async () => {
    await storage.saveBatch([createMockRecord("1"), createMockRecord("2")]);

    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200, statusText: "OK" });
    vi.stubGlobal("fetch", fetchSpy);

    await uploader.flush();

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://analytics.example.com/collect",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      })
    );

    vi.unstubAllGlobals();
  });

  it("should emit batch-sent event", async () => {
    await storage.save(createMockRecord("1"));

    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200, statusText: "OK" });
    vi.stubGlobal("fetch", fetchSpy);

    const events: UploadEvent[] = [];
    uploader.onEvent((e) => events.push(e));

    await uploader.flush();

    expect(events).toHaveLength(2); // batch-sent + batch-success
    expect(events[0]!.type).toBe("batch-sent");
    expect(events[1]!.type).toBe("batch-success");

    vi.unstubAllGlobals();
  });

  it("should not flush when no records", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await uploader.flush();

    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("should not flush when endpoint is empty", async () => {
    const uploaderNoEndpoint = new Uploader(storage, { endpoint: "" });
    await storage.save(createMockRecord("1"));

    const events: UploadEvent[] = [];
    uploaderNoEndpoint.onEvent((e) => events.push(e));

    await uploaderNoEndpoint.flush();

    expect(events.some((e) => e.type === "batch-failed")).toBe(true);
    uploaderNoEndpoint.destroy();
  });

  it("should retry on server errors", async () => {
    await storage.save(createMockRecord("1"));

    const fetchSpy = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 500, statusText: "Internal Server Error" })
      .mockResolvedValueOnce({ ok: true, status: 200, statusText: "OK" });
    vi.stubGlobal("fetch", fetchSpy);

    const events: UploadEvent[] = [];
    uploader.onEvent((e) => events.push(e));

    await uploader.flush();

    expect(events.some((e) => e.type === "retry-scheduled")).toBe(true);

    vi.unstubAllGlobals();
  });

  it("should not retry on client errors (4xx except 429)", async () => {
    await storage.save(createMockRecord("1"));

    const fetchSpy = vi.fn().mockResolvedValue({ ok: false, status: 400, statusText: "Bad Request" });
    vi.stubGlobal("fetch", fetchSpy);

    const events: UploadEvent[] = [];
    uploader.onEvent((e) => events.push(e));

    await uploader.flush();

    expect(events.some((e) => e.type === "batch-failed")).toBe(true);
    expect(events.some((e) => e.type === "retry-scheduled")).toBe(false);

    vi.unstubAllGlobals();
  });

  it("should retry on 429 (rate limited)", async () => {
    await storage.save(createMockRecord("1"));

    const fetchSpy = vi.fn().mockResolvedValue({ ok: false, status: 429, statusText: "Too Many Requests" });
    vi.stubGlobal("fetch", fetchSpy);

    const events: UploadEvent[] = [];
    uploader.onEvent((e) => events.push(e));

    await uploader.flush();

    expect(events.some((e) => e.type === "retry-scheduled")).toBe(true);
    vi.unstubAllGlobals();
  });

  it("should batch records according to batchSize", async () => {
    const records = Array.from({ length: 5 }, (_, i) => createMockRecord(String(i)));
    await storage.saveBatch(records);

    const uploaderSmall = new Uploader(storage, {
      endpoint: "https://analytics.example.com/collect",
      batchSize: 2,
      flushInterval: 0,
    });

    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200, statusText: "OK" });
    vi.stubGlobal("fetch", fetchSpy);

    await uploaderSmall.flush();
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.records).toHaveLength(2);

    vi.unstubAllGlobals();
    uploaderSmall.destroy();
  });
});
