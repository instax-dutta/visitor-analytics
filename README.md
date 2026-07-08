# Visitor Analytics SDK

Production-ready, framework-agnostic, privacy-preserving analytics SDK in TypeScript.

## Features

- **Framework-agnostic** — Works with React, Next.js, Vite, Vue, Svelte, SolidJS, Astro, and vanilla JS
- **Privacy-first** — Never collects PII; all data is anonymous and generalized for aggregate analytics
- **Plugin-based** — Modular collectors, storage adapters, and plugins
- **Type-safe** — Full TypeScript with strict types, no `any`
- **Tree-shakable** — ESM-first, import only what you need
- **Zero runtime deps** — No external dependencies
- **Performance-optimized** — Passive listeners, `requestIdleCallback`, debounced ops, batched DOM reads
- **Offline-ready** — Queue records offline, auto-sync when online
- **Resilient** — Exponential backoff retries, request deduplication

## Quick Start

```bash
npm install @visitor-analytics/core
```

```ts
import { createAnalytics } from "@visitor-analytics/core";

const analytics = createAnalytics({
  endpoint: "https://your-api.com/analytics",
  storage: "indexeddb",
  autoStart: true,
});

// That's it. Data starts collecting automatically.
```

## Architecture

```
visitor-analytics/
├── packages/
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
└── tests/             # Unit and integration tests
```

## Public API

### `createAnalytics(config)`

Creates a new analytics instance.

```ts
const analytics = createAnalytics({
  endpoint: "https://api.example.com/analytics",
  storage: "indexeddb",       // "memory" | "localstorage" | "indexeddb" | StorageAdapter
  autoStart: true,            // Start collecting immediately
  batchSize: 50,              // Records per upload batch
  flushInterval: 30000,       // ms between auto-flushes
  maxRetries: 5,              // Max retry attempts
  retryBaseDelay: 1000,       // Base delay for exponential backoff
  compressionEnabled: false,  // Gzip compression
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
analytics.flush()                          // Force upload pending records
analytics.sync()                           // Force sync (alias for flush)
analytics.retryFailed()                    // Retry failed uploads
analytics.use(plugin)                      // Install a plugin
analytics.addCollector(collector)          // Add a custom collector
analytics.removeCollector(name)            // Remove a collector
analytics.getCollectedData()               // Get all stored records
analytics.export()                         // Export as JSON string
analytics.on(event, handler)               // Subscribe to events
analytics.off(event, handler)              // Unsubscribe from events
analytics.destroy()                        // Cleanup everything
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

## Framework Integration

### React

```tsx
import { AnalyticsProvider, useAnalytics, useCollectedData } from "@visitor-analytics/framework/react";

// Wrap your app
function App() {
  return (
    <AnalyticsProvider config={{ endpoint: "/api/analytics", storage: "indexeddb" }}>
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
```

### Vue

```vue
<script setup>
import { createAnalyticsPlugin, useVueAnalytics } from "@visitor-analytics/framework/vue";

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
  import { createAnalyticsStore } from "@visitor-analytics/framework/svelte";

  const { analytics, data, start, stop, flush } = createAnalyticsStore({
    endpoint: "/api/analytics",
    storage: "indexeddb",
  });

  start();
</script>

<p>Records: {$data.length}</p>
<button on:click={flush}>Upload</button>
```

### SolidJS

```tsx
import { createAnalyticsHook, AnalyticsProvider } from "@visitor-analytics/framework/solid";

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
import { createAstroAnalytics } from "@visitor-analytics/framework/astro";

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
    // Analytics is already initialized
    import { createAnalytics } from "@visitor-analytics/core";
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
import { createAnalytics } from "@visitor-analytics/core";

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
import type { Collector, CollectorContext, AnalyticsRecord } from "@visitor-analytics/core";

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
import type { StorageAdapter, AnalyticsRecord } from "@visitor-analytics/core";

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
import type { Plugin, PluginContext } from "@visitor-analytics/core";

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

**Note:** The `sessionId` field is a random UUID generated in memory per `VisitorAnalytics` instance — it is not a tracking cookie, not persisted to disk, and not sent across sessions. Fields like `cookiesEnabled` and `cookieSupport` are browser capability flags (whether cookies/APIs are available), not cookie contents.

All data is anonymous and generalized for aggregate analytics only.

## Known Limitations

- **Route change detection** — The `InteractionCollector` detects route changes via the `popstate` event only (browser back/forward). It does **not** monkey-patch `history.pushState()` or `history.replaceState()`. SPA router transitions (React Router, Vue Router, etc.) that use `pushState` will not increment `routeChanges`. If you need full route change tracking, implement a custom collector that listens to your router's navigation events.
- **Multi-tab localStorage** — The `LocalStorageAdapter` uses a read-modify-write pattern that is not atomic. In multi-tab scenarios, the last writer wins and earlier records may be lost. Use `IndexedDB` as the storage backend for multi-tab environments.
- **Session timeout** — The `InteractionCollector` resets session counters (clicks, scrolls, etc.) after `sessionTimeout` (default 30 minutes) of inactivity. This is activity-based, not time-based — the session timer resets on each click.

## Performance

- **Passive event listeners** — Scroll, touch, and wheel events use `{ passive: true }`
- **`requestIdleCallback`** — Expensive operations deferred to idle time
- **Debounced ops** — Scroll depth and resize handlers are debounced
- **Lazy init** — Collectors initialize lazily on idle
- **Batched DOM reads** — DOM measurements batched via `requestAnimationFrame`
- **Tree-shakable** — Import only the modules you need

## Packages

| Package | Description |
|---------|-------------|
| `@visitor-analytics/core` | Main orchestrator, types, event bus |
| `@visitor-analytics/collectors` | Built-in data collectors |
| `@visitor-analytics/storage` | Storage adapters (memory, localStorage, IndexedDB) |
| `@visitor-analytics/uploader` | Batch uploads with retry and dedup |
| `@visitor-analytics/plugins` | Plugin manager |
| `@visitor-analytics/framework` | Framework integration shims |
| `@visitor-analytics/utils` | Shared utilities |

## License

MIT
