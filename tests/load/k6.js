// k6 load test for the Visitor Analytics backend.
// Requires k6: https://k6.io/docs/get-started/installation/
//
//   k6 run tests/load/k6.js
//
// Environment:
//   BACKEND_URL (default http://localhost:3000)
//   API_KEY     (default va_test_key_1)

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter } from "k6/metrics";

const BACKEND_URL = __ENV.BACKEND_URL || "http://localhost:3000";
const API_KEY = __ENV.API_KEY || "va_test_key_1";
const invalid = new Counter("invalid_payloads");

export const options = {
  stages: [
    { duration: "30s", target: 50 },
    { duration: "1m", target: 200 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500"],
  },
};

function makeRecord() {
  const now = Date.now();
  return {
    id: `k6_${Math.random().toString(36).slice(2)}`,
    timestamp: now,
    sessionId: `sess_${Math.floor(Math.random() * 100000)}`,
    pageUrl: "https://example.com/home",
    pagePath: "/home",
    referrer: "",
    screenWidth: 1920,
    screenHeight: 1080,
    viewportWidth: 1280,
    viewportHeight: 800,
    devicePixelRatio: 2,
    browser: { name: "Chrome", version: "120", engine: "Blink", engineVersion: "120", userAgent: "ua", language: "en", cookiesEnabled: true, javaScriptEnabled: true, doNotTrack: false },
    device: { os: "macOS", osVersion: "14", platform: "MacIntel", architecture: "x64", formFactor: "desktop", screenWidth: 1920, screenHeight: 1080, viewportWidth: 1280, viewportHeight: 800, devicePixelRatio: 2, colorDepth: 24, orientation: "landscape", touchSupport: "none", hardwareConcurrency: 8, maxTouchPoints: 0 },
    performance: { navigationTiming: null, paintTiming: null, largestContentfulPaint: 300, firstContentfulPaint: 120, cumulativeLayoutShift: 0.05, interactionToNextPaint: 80, deviceMemory: 8, networkType: "wifi", effectiveType: "4g", downlink: 10, rtt: 50, saveData: false },
    environment: { timezone: "UTC", timezoneOffset: 0, languages: ["en"], language: "en", locale: "en", prefersColorScheme: "dark", prefersReducedMotion: false, prefersContrast: "no-preference", colorGamut: "srgb", hdr: false, localStorageSupport: true, sessionStorageSupport: true, indexedDBSupport: true, cookieSupport: true, cacheAPISupport: true },
    features: { webgl: true, webgl2: true, webgpu: false, wasm: true, webrtc: true, websockets: true, broadcastChannel: true, sharedWorker: false, serviceWorker: true, notifications: true, clipboard: true, fileSystemAccess: false, webShare: true, webAuthn: true, pushManager: true, geolocation: true, bluetooth: false, usb: false, serial: false, gamepad: false, pictureInPicture: true, fullscreen: true },
    interaction: { sessionDuration: 120000, timeOnPage: 45000, routeChanges: 3, scrollDepth: 75, clickCount: 12, resizeCount: 1, visibilityChanges: 2, focusChanges: 4, landingPage: "/home", exitPage: null, utmSource: null, utmMedium: null, utmCampaign: null, utmTerm: null, utmContent: null },
    metadata: { sdkVersion: "1.0.1", buildTarget: "web", collectorVersion: "1.0.1", customData: {} },
  };
}

export default function () {
  const payload = JSON.stringify({
    records: Array.from({ length: 50 }, makeRecord),
    batchId: `k6_${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
    sdkVersion: "1.0.1",
  });
  const res = http.post(`${BACKEND_URL}/collect`, payload, {
    headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
  });
  const ok = check(res, { "status is 202": (r) => r.status === 202 });
  if (!ok && res.status === 422) invalid.add(1);
  sleep(0.1);
}
