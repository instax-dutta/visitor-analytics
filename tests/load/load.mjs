// Simple, dependency-free load generator for the Visitor Analytics backend.
// Sends batches of synthetic records to POST /collect and reports throughput
// and latency. Usage:
//   BACKEND_URL=http://localhost:3000 API_KEY=va_test_key_1 \
//   node tests/load/load.mjs --batches 2000 --concurrency 50 --records 50
//
// For a richer, scripted load test (ramps, thresholds, Grafana export) use
// tests/load/k6.js with `k6 run tests/load/k6.js`.

import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    batches: { type: "string", default: "1000" },
    concurrency: { type: "string", default: "25" },
    records: { type: "string", default: "50" },
  },
});

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";
const API_KEY = process.env.API_KEY ?? "va_test_key_1";
const TOTAL = Number(values.batches);
const CONCURRENCY = Number(values.concurrency);
const RECORDS_PER_BATCH = Number(values.records);

function makeRecord() {
  const now = Date.now();
  return {
    id: `load_${Math.random().toString(36).slice(2)}`,
    timestamp: now,
    sessionId: `sess_${Math.floor(Math.random() * 100000)}`,
    pageUrl: "https://example.com/home",
    pagePath: "/home",
    referrer: "https://google.com",
    screenWidth: 1920,
    screenHeight: 1080,
    viewportWidth: 1280,
    viewportHeight: 800,
    devicePixelRatio: 2,
    browser: { name: "Chrome", version: "120", engine: "Blink", engineVersion: "120", userAgent: "ua", language: "en", cookiesEnabled: true, javaScriptEnabled: true, doNotTrack: false },
    device: { os: "macOS", osVersion: "14", platform: "MacIntel", architecture: "x64", formFactor: "desktop", screenWidth: 1920, screenHeight: 1080, viewportWidth: 1280, viewportHeight: 800, devicePixelRatio: 2, colorDepth: 24, orientation: "landscape", touchSupport: "none", hardwareConcurrency: 8, maxTouchPoints: 0 },
    performance: { navigationTiming: { redirectTime: 0, dnsLookupTime: 12, tcpConnectTime: 20, requestTime: 30, responseTime: 50, domInteractiveTime: 200, domContentLoadedTime: 250, domCompleteTime: 400, loadTime: 450, duration: 450 }, paintTiming: { firstPaint: 100, firstContentfulPaint: 120 }, largestContentfulPaint: 300, firstContentfulPaint: 120, cumulativeLayoutShift: 0.05, interactionToNextPaint: 80, deviceMemory: 8, networkType: "wifi", effectiveType: "4g", downlink: 10, rtt: 50, saveData: false },
    environment: { timezone: "UTC", timezoneOffset: 0, languages: ["en"], language: "en", locale: "en", prefersColorScheme: "dark", prefersReducedMotion: false, prefersContrast: "no-preference", colorGamut: "srgb", hdr: false, localStorageSupport: true, sessionStorageSupport: true, indexedDBSupport: true, cookieSupport: true, cacheAPISupport: true },
    features: { webgl: true, webgl2: true, webgpu: false, wasm: true, webrtc: true, websockets: true, broadcastChannel: true, sharedWorker: false, serviceWorker: true, notifications: true, clipboard: true, fileSystemAccess: false, webShare: true, webAuthn: true, pushManager: true, geolocation: true, bluetooth: false, usb: false, serial: false, gamepad: false, pictureInPicture: true, fullscreen: true },
    interaction: { sessionDuration: 120000, timeOnPage: 45000, routeChanges: 3, scrollDepth: 75, clickCount: 12, resizeCount: 1, visibilityChanges: 2, focusChanges: 4, landingPage: "/home", exitPage: "/pricing", utmSource: null, utmMedium: null, utmCampaign: null, utmTerm: null, utmContent: null },
    metadata: { sdkVersion: "1.0.1", buildTarget: "web", collectorVersion: "1.0.1", customData: {} },
  };
}

async function sendBatch(i) {
  const payload = {
    records: Array.from({ length: RECORDS_PER_BATCH }, makeRecord),
    batchId: `load_batch_${i}`,
    timestamp: Date.now(),
    sdkVersion: "1.0.1",
  };
  const start = performance.now();
  const res = await fetch(`${BACKEND_URL}/collect`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
    body: JSON.stringify(payload),
  });
  const ms = performance.now() - start;
  if (!res.ok) throw new Error(`status ${res.status}`);
  return ms;
}

async function main() {
  console.log(`Load test: ${TOTAL} batches x ${RECORDS_PER_BATCH} records, concurrency ${CONCURRENCY} -> ${BACKEND_URL}`);
  const latencies = [];
  let ok = 0;
  let failed = 0;
  const startAll = performance.now();

  for (let i = 0; i < TOTAL; i += CONCURRENCY) {
    const chunk = Array.from({ length: Math.min(CONCURRENCY, TOTAL - i) }, (_, k) => sendBatch(i + k));
    const results = await Promise.allSettled(chunk);
    for (const r of results) {
      if (r.status === "fulfilled") {
        ok++;
        latencies.push(r.value);
      } else {
        failed++;
      }
    }
  }

  const totalMs = performance.now() - startAll;
  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)] ?? 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] ?? 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] ?? 0;
  const totalRecords = ok * RECORDS_PER_BATCH;
  console.log("--- results ---");
  console.log(`ok=${ok} failed=${failed}`);
  console.log(`throughput: ${(ok / (totalMs / 1000)).toFixed(1)} batches/s, ${(totalRecords / (totalMs / 1000)).toFixed(0)} records/s`);
  console.log(`latency ms: p50=${p50.toFixed(1)} p95=${p95.toFixed(1)} p99=${p99.toFixed(1)}`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
