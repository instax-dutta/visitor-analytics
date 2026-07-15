# Visitor Analytics SDK

[![npm version](https://img.shields.io/npm/v/@visitor-analytics-sdk/core.svg)](https://www.npmjs.com/package/@visitor-analytics-sdk/core)
[![CI](https://img.shields.io/github/actions/workflow/status/visitor-analytics/ci.yml?branch=main)](https://github.com/visitor-analytics/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Production-ready, framework-agnostic, privacy-preserving analytics SDK in TypeScript.

## Features

- **Framework-agnostic** -- Works with React, Next.js, Vite, Vue, Svelte, SolidJS, Astro, and vanilla JS
- **Privacy-first** -- Never collects PII; all data is anonymous and generalized for aggregate analytics
- **Plugin-based** -- Modular collectors, storage adapters, and plugins
- **Type-safe** -- Full TypeScript with strict types, no `any`
- **Tree-shakable** -- ESM-first, import only what you need
- **Zero runtime deps** -- No external dependencies
- **Performance-optimized** -- Passive listeners, `requestIdleCallback`, debounced ops, batched DOM reads
- **Offline-ready** -- Queue records offline, auto-sync when online
- **Resilient** -- Exponential backoff retries, request deduplication, sendBeacon fallback

## Quick Start

```bash
npm install @visitor-analytics-sdk/core
```

```ts
import { createAnalytics } from "@visitor-analytics-sdk/core";

const analytics = createAnalytics({
  endpoint: "https://your-api.com/analytics",
  // storage auto-detects: indexeddb -> localstorage -> memory
  autoStart: true,
});

// That's it. Data starts collecting automatically.
```

## Backend & Dashboard

The SDK sends data to the `endpoint` you provide. This repository now ships a complete,
production-ready backend ecosystem so you can actually receive, store, query, and
visualize that data:

- **`server/`** — Reference backend (Node.js + Express + TypeScript): ingest endpoint
  with API-key/HMAC auth, zod validation, PostgreSQL (or in-memory) storage, rate
  limiting, Prometheus metrics, health checks, a dashboard query API, and GDPR
  delete/export endpoints. See [`docs/backend-integration.md`](docs/backend-integration.md).
- **`dashboard/`** — Analytics dashboard (Next.js): KPIs, time-series, breakdowns, raw
  records, and CSV/JSON export.
- **`infra/`** — Docker Compose, nginx, Terraform (AWS ECS + RDS), and
  Prometheus/Grafana monitoring.
- **`docs/`** — Integration guide, OpenAPI spec, GDPR guide, deployment runbooks,
  troubleshooting, and schema-versioning strategy.
- **`tests/`** — E2E and load tests (Node + k6).

Get a full stack running locally:

```bash
# Backend (in-memory storage, no DB required for a quick start)
cd server && cp .env.example .env && npm install && npm run dev

# In another shell: dashboard
cd dashboard && cp .env.local.example .env.local && npm install && npm run dev
```

Or run everything with Docker:

```bash
API_KEYS="va_prod_key_change_me" docker compose -f infra/docker-compose.yml up --build
```

## Architecture

```
visitor-analytics/
├── packages/           # Client SDK (framework-agnostic, zero deps)
│   ├── core/          # Main orchestrator, types, event bus
│   ├── collectors/    # Modular data collectors
│   │   ├── browser/   # Browser name, version, engine
│   │   ├── device/    # OS, platform, screen, touch
│   │   ├── performance/ # Navigation, paint, CLS, LCP, INP
│   │   ├── environment/ # Timezone, language, preferences
│   │   ├── features/  # WebGL, WASM, WebGPU, etc.
│   │   └── interaction/ # Session, clicks, scroll, routes
│   ├── storage/       # Memory, localStorage, IndexedDB
│   ├── uploader/      # Batch uploads, retry, dedup
│   ├── plugins/       # Plugin manager
│   ├── framework/     # React, Vue, Svelte, Solid, Astro
│   └── utils/         # Shared utilities
├── server/            # Reference backend (Express + TS): ingest, auth, DB, API, GDPR, metrics
├── dashboard/         # Analytics dashboard (Next.js)
├── infra/             # docker-compose, nginx, terraform, monitoring
├── docs/              # Integration, OpenAPI, GDPR, runbooks, troubleshooting
├── tests/             # E2E + load tests (server/tests, tests/load)
└── PRODUCTION_READINESS.md  # Gap analysis (now fully implemented)
```

## Public API

### `createAnalytics(config)`

Creates a new analytics instance.

```ts
const analytics = createAnalytics({
  endpoint: "https://api.example.com/analytics",
  storage: "indexeddb",       // auto-detected if omitted: indexeddb -> localstorage -> memory
  autoStart: true,            // Start collecting immediately
  batchSize: 50,              // Records per upload batch
  flushInterval: 30000,       // ms between auto-flushes
  maxRetries: 5,              // Max retry attempts
  retryBaseDelay: 1000,       // Base delay for exponential backoff
  compressionEnabled: false,  // Gzip compression (requires CompressionStream: Chrome 80+, Firefox 113+, Safari 16.4+)
  deduplicationEnabled: true, // Deduplicate batches
  includeUserAgent: false,    // Include raw UA string
  includeReferrer: true,      // Include page referrer
  sessionTimeout: 1800000,    // Session timeout (30min)
  customData: {},             // Custom key-value pairs
});
```

### Instance Methods

```ts
analytics.start()                          // Begin collecting
analytics.stop()                           // Pause collecting
analytics.flush()                          // Force upload pending records (does NOT re-collect)
analytics.sync()                           // Force sync (alias for flush)
analytics.retryFailed()                    // Retry failed uploads
analytics.use(plugin)                      // Install a plugin
analytics.addCollector(collector)          // Add a custom collector
analytics.removeCollector(name)            // Remove a collector
analytics.getCollectedData()               // Get all stored records
analytics.query(query)                     // Query records with filters
analytics.export()                         // Export as JSON string
analytics.trackRouteChange(url)            // Manually track a SPA route change
analytics.on(event, handler)               // Subscribe to events
analytics.off(event, handler)              // Unsubscribe from events
analytics.destroy()                        // Cleanup everything
```

### Query API

```ts
const records = await analytics.query({
  since: Date.now() - 86400000,   // Last 24 hours
  until: Date.now(),
  pagePath: "/pricing",           // Filter by page path
  sessionId: "abc-123",           // Filter by session
  limit: 100,                     // Max records
  offset: 0,                      // Skip first N records
});
```

### Events

```ts
analytics.on("start", () => { /* ... */ });
analytics.on("stop", () => { /* ... */ });
analytics.on("flush", () => { /* ... */ });
analytics.on("record-collected", (record) => { /* ... */ });
analytics.on("batch-uploaded", (batchId) => { /* ... */ });
analytics.on("batch-failed", (batchId, error) => { /* ... */ });
analytics.on("collector-registered", (name) => { /* ... */ });
analytics.on("collector-removed", (name) => { /* ... */ });
analytics.on("plugin-installed", (name) => { /* ... */ });
analytics.on("plugin-uninstalled", (name) => { /* ... */ });
```

**Important:** When subscribing via `analytics.on()`, you must call `analytics.off()` to clean up. The React `useAnalyticsEvent` hook handles this automatically.

## Framework Integration

### React

```tsx
import { AnalyticsProvider, useAnalytics, usePageView, useCollectedData } from "@visitor-analytics-sdk/framework/react";

// Wrap your app
function App() {
  return (
    <AnalyticsProvider config={{ endpoint: "/api/analytics" }}>
      <Dashboard />
    </AnalyticsProvider>
  );
}

// Use in components
function Dashboard() {
  const analytics = useAnalytics();
  const { data, loading } = useCollectedData();

  return (
    <div>
      <p>Records collected: {data.length}</p>
      <button onClick={() => analytics.flush()}>Force Upload</button>
    </div>
  );
}

// Track page views in a layout (Next.js App Router example)
"use client";
import { usePathname } from "next/navigation";
import { usePageView } from "@visitor-analytics-sdk/framework/react";

export default function RootLayout({ children }) {
  const pathname = usePathname();
  usePageView(() => pathname);
  return <>{children}</>;
}
```

### Vue

```vue
<script setup>
import { createAnalyticsPlugin, useVueAnalytics } from "@visitor-analytics-sdk/framework/vue";

// In main.ts
const app = createApp(App);
app.use(createAnalyticsPlugin({ endpoint: "/api/analytics" }));

// In components
const analytics = useVueAnalytics();
const { data, loading } = useVueCollectedData();
</script>
```

### Svelte

```svelte
<script>
  import { createAnalyticsStore } from "@visitor-analytics-sdk/framework/svelte";

  const { analytics, data, start, stop, flush } = createAnalyticsStore({
    endpoint: "/api/analytics",
  });

  start();
</script>

<p>Records: {$data.length}</p>
<button on:click={flush}>Upload</button>
```

### SolidJS

```tsx
import { createAnalyticsHook, AnalyticsProvider } from "@visitor-analytics-sdk/framework/solid";

function App() {
  return (
    <AnalyticsProvider endpoint="/api/analytics" storage="indexeddb">
      <Dashboard />
    </AnalyticsProvider>
  );
}

function Dashboard() {
  const { data, flush } = createAnalyticsHook({
    endpoint: "/api/analytics",
    storage: "indexeddb",
  });

  return (
    <div>
      <p>Records: {data().length}</p>
      <button onClick={flush}>Upload</button>
    </div>
  );
}
```

### Astro

```astro
---
import { createAstroAnalytics } from "@visitor-analytics-sdk/framework/astro";

const analytics = createAstroAnalytics({
  endpoint: "/api/analytics",
  storage: "indexeddb",
});
---

<html>
<head>
  <title>My Site</title>
</head>
<body>
  <script type="module">
    import { createAnalytics } from "@visitor-analytics-sdk/core";
    window.__visitorAnalytics = createAnalytics({
      endpoint: '/api/analytics',
      storage: 'indexeddb',
    });
  </script>
</body>
</html>
```

### Vanilla JS

```ts
import { createAnalytics } from "@visitor-analytics-sdk/core";

const analytics = createAnalytics({
  endpoint: "https://api.example.com/analytics",
  storage: "indexeddb",
  autoStart: true,
});

// Listen for events
analytics.on("batch-uploaded", (batchId) => {
  console.log("Uploaded:", batchId);
});
```

## Custom Collector

```ts
import type { Collector, CollectorContext, AnalyticsRecord } from "@visitor-analytics-sdk/core";

class MyCollector implements Collector {
  readonly name = "my-collector";
  readonly category = "custom";
  readonly version = "1.0.0";
  enabled = true;

  async collect(context: CollectorContext): Promise<Partial<AnalyticsRecord>> {
    return {
      metadata: {
        sdkVersion: "1.0.0",
        buildTarget: "browser",
        collectorVersion: "1.0.0",
        customData: {
          userRole: "admin",
          experimentGroup: "A",
        },
      },
    };
  }
}

analytics.addCollector(new MyCollector());
```

## Custom Storage Adapter

```ts
import type { StorageAdapter, AnalyticsRecord } from "@visitor-analytics-sdk/core";

class RedisAdapter implements StorageAdapter {
  async save(record: AnalyticsRecord): Promise<void> {
    await fetch("/api/redis/save", {
      method: "POST",
      body: JSON.stringify(record),
    });
  }

  async saveBatch(records: readonly AnalyticsRecord[]): Promise<void> {
    await fetch("/api/redis/save-batch", {
      method: "POST",
      body: JSON.stringify(records),
    });
  }

  async load(): Promise<readonly AnalyticsRecord[]> {
    const res = await fetch("/api/redis/load");
    return res.json();
  }

  async loadBatch(limit: number): Promise<readonly AnalyticsRecord[]> {
    const res = await fetch(`/api/redis/load-batch?limit=${limit}`);
    return res.json();
  }

  async remove(ids: readonly string[]): Promise<void> {
    await fetch("/api/redis/remove", {
      method: "POST",
      body: JSON.stringify(ids),
    });
  }

  async count(): Promise<number> {
    const res = await fetch("/api/redis/count");
    return res.json();
  }

  async clear(): Promise<void> {
    await fetch("/api/redis/clear", { method: "POST" });
  }

  async export(): Promise<string> {
    const res = await fetch("/api/redis/export");
    return res.text();
  }
}

const analytics = createAnalytics({
  endpoint: "/api/analytics",
  storage: new RedisAdapter(),
});
```

## Plugin System

```ts
import type { Plugin, PluginContext } from "@visitor-analytics-sdk/core";

class ABTestPlugin implements Plugin {
  readonly name = "ab-test";
  readonly version = "1.0.0";
  readonly description = "Adds A/B test variant data to analytics";

  install(ctx: PluginContext): void {
    const variant = localStorage.getItem("ab-variant") ?? "control";
    const collector = {
      name: "ab-test-collector",
      category: "custom",
      version: "1.0.0",
      enabled: true,
      collect: async () => ({
        metadata: {
          sdkVersion: "1.0.0",
          buildTarget: "browser",
          collectorVersion: "1.0.0",
          customData: { abVariant: variant },
        },
      }),
    };
    ctx.addCollector(collector);
  }

  uninstall(ctx: PluginContext): void {
    ctx.removeCollector("ab-test-collector");
  }
}

analytics.use(new ABTestPlugin());
```

## SPA Route Tracking

The interaction collector automatically tracks route changes by wrapping `history.pushState()` and `history.replaceState()`. This works with all SPA frameworks (React Router, Vue Router, SvelteKit, etc.).

For manual route tracking (e.g., in a custom router):

```ts
analytics.trackRouteChange("/new-page");
```

In React with Next.js App Router:

```tsx
"use client";
import { usePathname } from "next/navigation";
import { usePageView } from "@visitor-analytics-sdk/framework/react";

export function RouteTracker() {
  const pathname = usePathname();
  usePageView(() => pathname);
  return null;
}
```

## Content Security Policy (CSP)

The SDK uses `fetch()` to POST data to your analytics endpoint. You must include your endpoint domain in the `connect-src` directive:

```html
<meta http-equiv="Content-Security-Policy"
  content="connect-src 'self' https://your-analytics-api.com">
```

If using `sendBeacon` for page-unload reliability, no additional CSP directives are needed (beacons use the same `connect-src` rule).

## Data Schema

```json
{
  "id": "uuid",
  "timestamp": 1719760000000,
  "sessionId": "uuid",
  "pageUrl": "https://example.com/page",
  "pagePath": "/page",
  "referrer": "https://google.com",
  "screenWidth": 1920,
  "screenHeight": 1080,
  "viewportWidth": 1920,
  "viewportHeight": 1080,
  "devicePixelRatio": 2,
  "browser": {
    "name": "Chrome",
    "version": "120.0.0",
    "engine": "Blink",
    "engineVersion": "120.0.0",
    "language": "en-US",
    "cookiesEnabled": true,
    "doNotTrack": null
  },
  "device": {
    "os": "Windows",
    "osVersion": "10/11",
    "platform": "Win32",
    "architecture": "x86_64",
    "formFactor": "desktop",
    "touchSupport": "none",
    "hardwareConcurrency": 8
  },
  "performance": {
    "navigationTiming": { "loadTime": 1200, "domContentLoadedTime": 800 },
    "paintTiming": { "firstPaint": 100, "firstContentfulPaint": 200 },
    "largestContentfulPaint": 1500,
    "firstContentfulPaint": 200,
    "cumulativeLayoutShift": 0.05,
    "interactionToNextPaint": 50,
    "effectiveType": "4g",
    "saveData": false
  },
  "environment": {
    "timezone": "America/New_York",
    "language": "en-US",
    "prefersColorScheme": "dark",
    "prefersReducedMotion": false,
    "colorGamut": "p3",
    "hdr": true
  },
  "features": {
    "webgl": true,
    "webgpu": false,
    "wasm": true,
    "webrtc": true,
    "serviceWorker": true,
    "notifications": true,
    "clipboard": true
  },
  "interaction": {
    "sessionDuration": 120000,
    "timeOnPage": 60000,
    "routeChanges": 5,
    "scrollDepth": 75,
    "clickCount": 12,
    "utmSource": "twitter",
    "utmMedium": "social"
  },
  "metadata": {
    "sdkVersion": "1.0.0",
    "customData": { "experiment": "A" }
  }
}
```

## Privacy Rules

This SDK **never** collects:

- Names, emails, phone numbers
- Passwords or auth tokens
- Cookies or session storage contents
- Form contents or typed text
- Clipboard contents
- Exact IP addresses
- GPS coordinates
- Keystrokes or click coordinates
- Persistent fingerprint IDs
- Any personally identifiable information (PII)

**Note:** The `sessionId` field is a random UUID generated in memory per `VisitorAnalytics` instance -- it is not a tracking cookie, not persisted to disk, and not sent across sessions. Fields like `cookiesEnabled` and `cookieSupport` are browser capability flags (whether cookies/APIs are available), not cookie contents.

All data is anonymous and generalized for aggregate analytics only.

## Known Limitations

- **Session timeout** -- The `InteractionCollector` resets session counters (clicks, scrolls, etc.) after `sessionTimeout` (default 30 minutes) of inactivity. This is activity-based, not time-based -- the session timer resets on each click.
- **Multi-tab localStorage** -- The `LocalStorageAdapter` uses a read-modify-write pattern that is not atomic. In multi-tab scenarios, the last writer wins and earlier records may be lost. Use `IndexedDB` as the storage backend for multi-tab environments.
- **Compression** -- `CompressionStream` is required for gzip compression. Supported in Chrome 80+, Firefox 113+, Safari 16.4+. Falls back to uncompressed JSON on unsupported browsers.

## Performance

- **Passive event listeners** -- Scroll, touch, and wheel events use `{ passive: true }`
- **`requestIdleCallback`** -- Expensive operations deferred to idle time
- **Debounced ops** -- Scroll depth and resize handlers are debounced
- **Lazy init** -- Collectors initialize lazily on idle
- **Batched DOM reads** -- DOM measurements batched via `requestAnimationFrame`
- **Tree-shakable** -- Import only the modules you need
- **sendBeacon fallback** -- Reliable delivery on page unload via `navigator.sendBeacon()`

## Packages

| Package | Description |
|---------|-------------|
| `@visitor-analytics-sdk/core` | Main orchestrator, types, event bus |
| `@visitor-analytics-sdk/collectors` | Built-in data collectors |
| `@visitor-analytics-sdk/storage` | Storage adapters (memory, localStorage, IndexedDB) |
| `@visitor-analytics-sdk/uploader` | Batch uploads with retry and dedup |
| `@visitor-analytics-sdk/plugins` | Plugin manager |
| `@visitor-analytics-sdk/framework` | Framework integration shims |
| `@visitor-analytics-sdk/utils` | Shared utilities |

## License

MIT
