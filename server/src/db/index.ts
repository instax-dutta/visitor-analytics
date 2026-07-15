import { config } from "../config.js";
import type { Storage } from "./types.js";
import { MemoryStorage } from "./memory.js";
import { PostgresStorage } from "./postgres.js";

export type { Storage } from "./types.js";
export * from "./types.js";

let instance: Storage | null = null;

/** Returns a process-wide storage instance based on configuration. */
export async function getStorage(): Promise<Storage> {
  if (instance) return instance;
  if (config.storage === "postgres") {
    instance = new PostgresStorage(config.databaseUrl);
  } else {
    instance = new MemoryStorage();
  }
  await instance.init();
  return instance;
}

export function createStorage(): Storage {
  if (config.storage === "postgres") {
    return new PostgresStorage(config.databaseUrl);
  }
  return new MemoryStorage();
}
