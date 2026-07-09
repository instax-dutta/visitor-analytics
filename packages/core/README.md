# @visitor-analytics-sdk/core

Privacy-preserving, framework-agnostic, zero-dependency analytics SDK for web applications. Drop it in any stack and start collecting anonymous visitor data — browser, device, performance, features, environment, and interaction.

```bash
npm install @visitor-analytics-sdk/core
```

```ts
import { createAnalytics } from "@visitor-analytics-sdk/core";

const analytics = createAnalytics({
  endpoint: "/api/analytics",
  storage: "indexeddb",
  autoStart: true,
});
```

## Features

- **Zero runtime dependencies** — no external packages, tiny bundle impact
- **Privacy-first** — never collects PII; all data anonymous and aggregate-only
- **Plugin-based** — modular collectors, storage adapters, and plugins
- **Full TypeScript** — strict types, no `any`, auto-complete ready
- **Tree-shakable** — ESM-first, import only what you need
- **Offline-ready** — queues records offline, auto-syncs when online
- **Framework-agnostic** — works with React, Vue, Svelte, Solid, Astro, vanilla JS

## API

```ts
createAnalytics({
  endpoint: string;
  storage: "memory" | "localstorage" | "indexeddb" | StorageAdapter;
  autoStart?: boolean;
  batchSize?: number;        // default: 50
  flushInterval?: number;    // default: 30000 (30s)
  maxRetries?: number;       // default: 5
  compressionEnabled?: boolean;
  deduplicationEnabled?: boolean;
  sessionTimeout?: number;   // default: 1800000 (30min)
  includeUserAgent?: boolean;
  includeReferrer?: boolean;
  customData?: Record<string, string | number | boolean>;
})
```

### Instance methods

```ts
analytics.start()
analytics.stop()
analytics.flush()
analytics.sync()
analytics.retryFailed()
analytics.use(plugin)
analytics.addCollector(collector)
analytics.removeCollector(name)
analytics.query(filters)
analytics.getCollectedData()
analytics.export()
analytics.on(event, handler)
analytics.off(event, handler)
analytics.destroy()
```

### Events

```ts
analytics.on("start", () => {});
analytics.on("stop", () => {});
analytics.on("flush", () => {});
analytics.on("record-collected", (record) => {});
analytics.on("batch-uploaded", (batchId) => {});
analytics.on("batch-failed", (batchId, error) => {});
```

## Collectors

Six built-in collectors activate automatically:

| Collector | Data |
|---|---|
| Browser | name, version, engine, language |
| Device | OS, screen, touch, form factor |
| Performance | CLS, LCP, INP, navigation timing |
| Environment | timezone, language, color scheme |
| Features | WebGL, WASM, WebGPU, WebRTC |
| Interaction | session, clicks, scroll, routes |

## License

MIT
