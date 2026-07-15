import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import type { Express } from "express";

import { createApp } from "../src/app.js";
import type { AnalyticsRecordDTO } from "../src/schema.js";

let app: Express;

function makeRecord(overrides: Partial<AnalyticsRecordDTO> = {}): AnalyticsRecordDTO {
  const base: AnalyticsRecordDTO = {
    id: `rec_${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
    sessionId: "sess_abc123",
    pageUrl: "https://example.com/home",
    pagePath: "/home",
    referrer: "https://google.com",
    screenWidth: 1920,
    screenHeight: 1080,
    viewportWidth: 1280,
    viewportHeight: 800,
    devicePixelRatio: 2,
    browser: {
      name: "Chrome",
      version: "120.0",
      engine: "Blink",
      engineVersion: "120.0",
      userAgent: "Mozilla/5.0",
      language: "en-US",
      cookiesEnabled: true,
      javaScriptEnabled: true,
      doNotTrack: false,
    },
    device: {
      os: "macOS",
      osVersion: "14.0",
      platform: "MacIntel",
      architecture: "x64",
      formFactor: "desktop",
      screenWidth: 1920,
      screenHeight: 1080,
      viewportWidth: 1280,
      viewportHeight: 800,
      devicePixelRatio: 2,
      colorDepth: 24,
      orientation: "landscape",
      touchSupport: "none",
      hardwareConcurrency: 8,
      maxTouchPoints: 0,
    },
    performance: {
      navigationTiming: {
        redirectTime: 0,
        dnsLookupTime: 12,
        tcpConnectTime: 20,
        requestTime: 30,
        responseTime: 50,
        domInteractiveTime: 200,
        domContentLoadedTime: 250,
        domCompleteTime: 400,
        loadTime: 450,
        duration: 450,
      },
      paintTiming: { firstPaint: 100, firstContentfulPaint: 120 },
      largestContentfulPaint: 300,
      firstContentfulPaint: 120,
      cumulativeLayoutShift: 0.05,
      interactionToNextPaint: 80,
      deviceMemory: 8,
      networkType: "wifi",
      effectiveType: "4g",
      downlink: 10,
      rtt: 50,
      saveData: false,
    },
    environment: {
      timezone: "America/New_York",
      timezoneOffset: -300,
      languages: ["en-US", "en"],
      language: "en-US",
      locale: "en-US",
      prefersColorScheme: "dark",
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
      webAuthn: true,
      pushManager: true,
      geolocation: true,
      bluetooth: false,
      usb: false,
      serial: false,
      gamepad: false,
      pictureInPicture: true,
      fullscreen: true,
    },
    interaction: {
      sessionDuration: 120000,
      timeOnPage: 45000,
      routeChanges: 3,
      scrollDepth: 75,
      clickCount: 12,
      resizeCount: 1,
      visibilityChanges: 2,
      focusChanges: 4,
      landingPage: "/home",
      exitPage: "/pricing",
      utmSource: "newsletter",
      utmMedium: "email",
      utmCampaign: "spring",
      utmTerm: null,
      utmContent: null,
    },
    metadata: {
      sdkVersion: "1.0.1",
      buildTarget: "web",
      collectorVersion: "1.0.1",
      customData: { userId: "u_42" },
    },
  };
  return { ...base, ...overrides };
}

beforeAll(() => {
  app = createApp();
});

describe("ingest endpoint", () => {
  it("rejects requests without an API key", async () => {
    const res = await request(app).post("/collect").send({ records: [], batchId: "b1", timestamp: Date.now(), sdkVersion: "1.0.1" });
    expect(res.status).toBe(401);
  });

  it("rejects an invalid API key", async () => {
    const res = await request(app)
      .post("/collect")
      .set("X-API-Key", "wrong_key")
      .send({ records: [makeRecord()], batchId: "b2", timestamp: Date.now(), sdkVersion: "1.0.1" });
    expect(res.status).toBe(401);
  });

  it("accepts a valid batch and stores it", async () => {
    const res = await request(app)
      .post("/collect")
      .set("X-API-Key", "test_key_ingest")
      .send({ records: [makeRecord()], batchId: "b3", timestamp: Date.now(), sdkVersion: "1.0.1" });
    expect(res.status).toBe(202);
    expect(res.body.status).toBe("accepted");
    expect(res.body.inserted).toBe(1);
  });

  it("rejects a malformed payload (validation)", async () => {
    const res = await request(app)
      .post("/collect")
      .set("X-API-Key", "test_key_ingest")
      .send({ records: [{ id: 123 }], batchId: "b4", timestamp: Date.now(), sdkVersion: "1.0.1" });
    expect(res.status).toBe(422);
  });
});

describe("query + dashboard API", () => {
  beforeAll(async () => {
    await request(app)
      .post("/collect")
      .set("X-API-Key", "test_key_admin")
      .send({ records: [makeRecord(), makeRecord({ sessionId: "sess_def456" })], batchId: "bq1", timestamp: Date.now(), sdkVersion: "1.0.1" });
  });

  it("returns a summary for the authenticated project", async () => {
    const res = await request(app).get("/api/v1/summary").set("X-API-Key", "test_key_admin");
    expect(res.status).toBe(200);
    expect(res.body.totalVisits).toBeGreaterThanOrEqual(2);
    expect(res.body.uniqueSessions).toBeGreaterThanOrEqual(2);
    expect(res.body.avgLoadTime).toBeGreaterThan(0);
  });

  it("returns a time series", async () => {
    const res = await request(app).get("/api/v1/timeseries?interval=day").set("X-API-Key", "test_key_admin");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.points)).toBe(true);
  });

  it("returns a breakdown by browser", async () => {
    const res = await request(app).get("/api/v1/breakdown?dimension=browser").set("X-API-Key", "test_key_admin");
    expect(res.status).toBe(200);
    expect(res.body.rows.some((r: { key: string }) => r.key === "Chrome")).toBe(true);
  });

  it("isolates data per project (tenant scope)", async () => {
    const res = await request(app).get("/api/v1/summary").set("X-API-Key", "test_key_ingest");
    expect(res.status).toBe(200);
    // test_key_ingest only has the 1 record from the earlier ingest test.
    expect(res.body.totalVisits).toBe(1);
  });
});

describe("GDPR admin API", () => {
  it("exports a subject's data", async () => {
    const res = await request(app)
      .get("/api/v1/export?customDataKey=userId&customDataValue=u_42")
      .set("X-API-Key", "test_key_admin");
    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThanOrEqual(2);
  });

  it("deletes a subject's data by sessionId", async () => {
    const res = await request(app)
      .delete("/api/v1/data")
      .set("X-API-Key", "test_key_admin")
      .send({ sessionId: "sess_abc123" });
    expect(res.status).toBe(200);
    expect(res.body.deleted).toBeGreaterThanOrEqual(1);

    const after = await request(app).get("/api/v1/summary").set("X-API-Key", "test_key_admin");
    // sess_abc123 removed; sess_def456 remains.
    expect(after.body.uniqueSessions).toBe(1);
  });
});

describe("health + metrics", () => {
  it("reports healthy", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("exposes prometheus metrics", async () => {
    const res = await request(app).get("/metrics");
    expect(res.status).toBe(200);
    expect(res.text).toContain("va_ingest_batches_total");
  });
});
