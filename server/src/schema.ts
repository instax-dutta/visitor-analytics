import { z } from "zod";

/**
 * Server-side validation schema for the Visitor Analytics data contract.
 *
 * This mirrors the client SDK `AnalyticsRecord` / `UploadPayload` types but is
 * intentionally tolerant of unknown fields (`.passthrough()`) so that newer SDK
 * versions adding metrics do not break ingestion. Required structural fields
 * are still enforced to guarantee data quality.
 *
 * Schema versioning strategy:
 *  - Each upload payload MAY carry `schemaVersion`. When absent it defaults to
 *    CURRENT_SCHEMA_VERSION.
 *  - The version is persisted alongside every record so queries/exports remain
 *    interpretable even after the contract evolves.
 *  - Breaking changes bump CURRENT_SCHEMA_VERSION and add a migration note in
 *    docs/schema-versioning.md. Non-breaking (additive) changes require no bump.
 */

export const CURRENT_SCHEMA_VERSION = 1 as const;
export const MIN_SUPPORTED_SCHEMA_VERSION = 1 as const;

const stringOrNumber = z.union([z.string(), z.number()]);
const nullable = <T extends z.ZodTypeAny>(t: T) => t.nullable();

export const browserSchema = z
  .object({
    name: z.string(),
    version: z.string(),
    engine: z.string(),
    engineVersion: z.string(),
    userAgent: z.string(),
    language: z.string(),
    cookiesEnabled: z.boolean(),
    javaScriptEnabled: z.boolean(),
    doNotTrack: nullable(z.boolean()),
  })
  .passthrough();

export const deviceSchema = z
  .object({
    os: z.string(),
    osVersion: z.string(),
    platform: z.string(),
    architecture: z.string(),
    formFactor: z.enum(["desktop", "mobile", "tablet", "smarttv", "wearable", "console", "unknown"]),
    screenWidth: z.number(),
    screenHeight: z.number(),
    viewportWidth: z.number(),
    viewportHeight: z.number(),
    devicePixelRatio: z.number(),
    colorDepth: z.number(),
    orientation: z.string(),
    touchSupport: z.enum(["none", "coarse", "fine"]),
    hardwareConcurrency: z.number(),
    maxTouchPoints: z.number(),
  })
  .passthrough();

export const navigationTimingSchema = z
  .object({
    redirectTime: z.number(),
    dnsLookupTime: z.number(),
    tcpConnectTime: z.number(),
    requestTime: z.number(),
    responseTime: z.number(),
    domInteractiveTime: z.number(),
    domContentLoadedTime: z.number(),
    domCompleteTime: z.number(),
    loadTime: z.number(),
    duration: z.number(),
  })
  .passthrough();

export const paintTimingSchema = z
  .object({
    firstPaint: z.number(),
    firstContentfulPaint: z.number(),
  })
  .passthrough();

export const performanceSchema = z
  .object({
    navigationTiming: nullable(navigationTimingSchema),
    paintTiming: nullable(paintTimingSchema),
    largestContentfulPaint: nullable(z.number()),
    firstContentfulPaint: nullable(z.number()),
    cumulativeLayoutShift: nullable(z.number()),
    interactionToNextPaint: nullable(z.number()),
    deviceMemory: nullable(z.number()),
    networkType: z.string(),
    effectiveType: z.string(),
    downlink: nullable(z.number()),
    rtt: nullable(z.number()),
    saveData: z.boolean(),
  })
  .passthrough();

export const environmentSchema = z
  .object({
    timezone: z.string(),
    timezoneOffset: z.number(),
    languages: z.array(z.string()),
    language: z.string(),
    locale: z.string(),
    prefersColorScheme: z.enum(["light", "dark", "no-preference"]),
    prefersReducedMotion: z.boolean(),
    prefersContrast: z.enum(["no-preference", "more", "less", "custom"]),
    colorGamut: z.enum(["srgb", "p3", "rec2020", "unknown"]),
    hdr: z.boolean(),
    localStorageSupport: z.boolean(),
    sessionStorageSupport: z.boolean(),
    indexedDBSupport: z.boolean(),
    cookieSupport: z.boolean(),
    cacheAPISupport: z.boolean(),
  })
  .passthrough();

export const featureSchema = z
  .object({
    webgl: z.boolean(),
    webgl2: z.boolean(),
    webgpu: z.boolean(),
    wasm: z.boolean(),
    webrtc: z.boolean(),
    websockets: z.boolean(),
    broadcastChannel: z.boolean(),
    sharedWorker: z.boolean(),
    serviceWorker: z.boolean(),
    notifications: z.boolean(),
    clipboard: z.boolean(),
    fileSystemAccess: z.boolean(),
    webShare: z.boolean(),
    webAuthn: z.boolean(),
    pushManager: z.boolean(),
    geolocation: z.boolean(),
    bluetooth: z.boolean(),
    usb: z.boolean(),
    serial: z.boolean(),
    gamepad: z.boolean(),
    pictureInPicture: z.boolean(),
    fullscreen: z.boolean(),
  })
  .passthrough();

export const interactionSchema = z
  .object({
    sessionDuration: z.number(),
    timeOnPage: z.number(),
    routeChanges: z.number(),
    scrollDepth: z.number(),
    clickCount: z.number(),
    resizeCount: z.number(),
    visibilityChanges: z.number(),
    focusChanges: z.number(),
    landingPage: z.string(),
    exitPage: nullable(z.string()),
    utmSource: nullable(z.string()),
    utmMedium: nullable(z.string()),
    utmCampaign: nullable(z.string()),
    utmTerm: nullable(z.string()),
    utmContent: nullable(z.string()),
  })
  .passthrough();

export const metadataSchema = z
  .object({
    sdkVersion: z.string(),
    buildTarget: z.string(),
    collectorVersion: z.string(),
    customData: z.record(stringOrNumber.or(z.boolean())),
  })
  .passthrough();

export const analyticsRecordSchema = z
  .object({
    id: z.string().min(1).max(128),
    timestamp: z.number().int().positive(),
    sessionId: z.string().min(1).max(128),
    pageUrl: z.string().max(4096),
    pagePath: z.string().max(2048),
    referrer: z.string().max(4096),
    screenWidth: z.number(),
    screenHeight: z.number(),
    viewportWidth: z.number(),
    viewportHeight: z.number(),
    devicePixelRatio: z.number(),
    browser: browserSchema,
    device: deviceSchema,
    performance: performanceSchema,
    environment: environmentSchema,
    features: featureSchema,
    interaction: interactionSchema,
    metadata: metadataSchema,
  })
  .passthrough();

export const uploadPayloadSchema = z
  .object({
    schemaVersion: z.number().int().min(1).max(999).optional(),
    batchId: z.string().min(1).max(128),
    timestamp: z.number().int().positive(),
    sdkVersion: z.string(),
    records: z.array(analyticsRecordSchema).min(1).max(1000),
  })
  .passthrough();

export type AnalyticsRecordDTO = z.infer<typeof analyticsRecordSchema>;
export type UploadPayloadDTO = z.infer<typeof uploadPayloadSchema>;

/**
 * Validate a raw request body against the upload contract. Throws a ZodError
 * describing exactly which fields failed, which callers map to a 422 response.
 */
export function parseUploadPayload(raw: unknown): UploadPayloadDTO {
  const parsed = uploadPayloadSchema.parse(raw);
  const version = parsed.schemaVersion ?? CURRENT_SCHEMA_VERSION;
  if (version < MIN_SUPPORTED_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported schemaVersion ${version}; minimum supported is ${MIN_SUPPORTED_SCHEMA_VERSION}`
    );
  }
  return parsed;
}
