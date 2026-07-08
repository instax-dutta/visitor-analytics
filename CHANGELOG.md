# Changelog

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
