# @visitor-analytics-sdk/storage

Storage adapters for the visitor-analytics SDK — memory, localStorage, and IndexedDB backends with a common interface.

```bash
npm install @visitor-analytics-sdk/storage
```

## Adapters

| Adapter | Persistence | Multi-tab |
|---|---|---|
| `MemoryStorage` | Session only | No |
| `LocalStorageAdapter` | Persistent | No |
| `IndexedDBAdapter` | Persistent | Yes (recommended) |

## Usage

```ts
import { StorageAdapterFactory } from "@visitor-analytics-sdk/storage";

const storage = StorageAdapterFactory.create("indexeddb");
await storage.save(record);
const records = await storage.load();
```

Auto-detection selects the best available backend:

```ts
StorageAdapterFactory.createAuto(); // indexeddb > localstorage > memory
```

## License

MIT
