# @visitor-analytics-sdk/collectors

Modular data collectors for the visitor-analytics SDK — browser detection, device info, performance metrics, environment features, and user interaction tracking.

```bash
npm install @visitor-analytics-sdk/collectors
```

## Collectors

| Collector | Description |
|---|---|
| `BrowserCollector` | Browser name, version, engine, language, UA flags |
| `DeviceCollector` | OS, platform, architecture, form factor, screen, touch support |
| `PerformanceCollector` | Navigation timing, paint timing, CLS, LCP, INP, network info |
| `EnvironmentCollector` | Timezone, language, locale, color scheme, reduced motion, storage support |
| `FeatureCollector` | WebGL, WebGPU, WASM, WebRTC, WebSockets, Service Worker, and 20+ feature flags |
| `InteractionCollector` | Session duration, time on page, route changes, scroll depth, clicks, UTM params |

## Usage

```ts
import { BrowserCollector, DeviceCollector } from "@visitor-analytics-sdk/collectors";

const browserCollector = new BrowserCollector({ includeUserAgent: true });
const data = await browserCollector.collect(context);
```

Collectors are auto-registered when using `createAnalytics()` from `@visitor-analytics-sdk/core`.

## License

MIT
