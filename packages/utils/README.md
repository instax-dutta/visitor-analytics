# @visitor-analytics-sdk/utils

Shared utilities for the visitor-analytics SDK — ID generation, browser detection, idle callbacks, SDK versioning, and type definitions.

```bash
npm install @visitor-analytics-sdk/utils
```

## Utilities

| Export | Description |
|---|---|
| `generateId()` | Unique ID generator (crypto-based) |
| `isBrowser()` | Runtime environment detection |
| `requestIdle(fn)` | `requestIdleCallback` wrapper |
| `SDK_VERSION` | Current SDK version string |
| `deepFreeze(obj)` | Recursive `Object.freeze` |
| `EventBus` | Typed event emitter |
| `AnalyticsEvent` | Event type definitions |
| `StorageType` | Storage backend type union |

## License

MIT
