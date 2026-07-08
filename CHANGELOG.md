# Changelog

## [1.0.1] - 2026-07-09

### Fixed
- **[C1]** SSR/SSG guarding -- `buildCollectorContext()` now returns null on server, preventing ReferenceErrors in Next.js/Astro/Remix
- **[C2]** Timer/flush conflict -- `flush()` and `sync()` no longer call `collectAndStore()` before uploading, preventing duplicate records
- **[C3]** `sendBeacon` fallback -- Added `beforeunload` listener that drains remaining storage via `navigator.sendBeacon()` for reliable page-unload delivery
- **[C4]** Double deep-copy removed -- Storage adapters no longer call `cloneRecord()` since `structuredClone` already produces unique objects
- **[H1]** Improved UA parsing -- Added detection for Samsung Internet, UC Browser, Opera Mini, Chrome on iOS (`CriOS/`), and headless browsers; reordered checks to prevent misclassification
- **[H2]** Circular dependency broken -- Moved `EventBus` from `@visitor-analytics/core` to `@visitor-analytics/utils`; plugins now import EventBus from utils
- **[H3]** SPA route tracking -- Interaction collector now wraps `history.pushState()` and `history.replaceState()` to detect SPA route changes; added `trackRouteChange(url)` public API
- **[H4]** Documented `analytics.on()` cleanup requirement
- **[H5]** Default storage auto-detection -- Storage defaults to `indexeddb -> localstorage -> memory` instead of always `memory`
- **[H6]** `SDK_VERSION` build injection via tsup `--define` (ready for build config)
- **[L1]** Removed unused `noop` and `padZero` exports
- **[L4]** Added `@visitor-analytics-sdk/core` to framework `peerDependencies`
- **[L5]** Fixed tsconfig `include` to match `.tsx` files
- **[L6]** `UploadEvent` is now a discriminated union for proper type narrowing
- **[L9]** Renamed all packages from `@visitor-analytics/*` to `@visitor-analytics-sdk/*` to match npm scope
- **[L10]** Added `publishConfig.access: "public"` to all package.json files

### Added
- **[M2]** Query API -- `analytics.query({ since, until, pagePath, sessionId, limit, offset })` for filtering stored records
- **[M4]** `usePageView()` React hook for automatic page view tracking on route changes
- **[M5]** Auto-discovered framework entry points in build script via tsup config
- **[M3]** `--treeshake` flag added to all tsup builds

## [1.0.0] - 2026-07-07

### Added
- Initial release of Visitor Analytics SDK
- 7 packages: core, collectors, storage, uploader, plugins, framework, utils
- Browser, device, performance, environment, features, interaction collectors
- Memory, localStorage, IndexedDB storage adapters
- React, Vue, Svelte, Solid, Astro framework integrations
- Plugin system for extensibility
- Batch upload with retry, deduplication, and compression
- Privacy-first design (no PII collected)
- Framework-agnostic core with tree-shaking support

### Fixed
- EnvironmentCollector Cache API detection uses context instead of bare globals
- InteractionCollector scroll handler uses context instead of bare globals
- IndexedDB adapter init failure now allows retry
- Centralized SDK version string across all packages
- MemoryStorage returns deep copies to prevent external mutation
