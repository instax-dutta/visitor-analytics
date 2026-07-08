import type { StorageAdapter } from "@visitor-analytics-sdk/core";
import { MemoryStorage } from "./memory-storage";
import { LocalStorageAdapter } from "./localstorage-adapter";
import { IndexedDBAdapter } from "./indexeddb-adapter";

export class StorageAdapterFactory {
  static create(type: "memory" | "localstorage" | "indexeddb" | StorageAdapter): StorageAdapter {
    if (typeof type === "object" && typeof type.save === "function") {
      return type;
    }

    switch (type) {
      case "memory":
        return new MemoryStorage();
      case "localstorage":
        return new LocalStorageAdapter();
      case "indexeddb":
        return new IndexedDBAdapter();
      default:
        throw new Error(`Unknown storage type: ${String(type)}`);
    }
  }
}

export function createMemoryStorage(): StorageAdapter {
  return new MemoryStorage();
}

export function createLocalStorageAdapter(): StorageAdapter {
  return new LocalStorageAdapter();
}

export function createIndexedDBAdapter(): StorageAdapter {
  return new IndexedDBAdapter();
}
