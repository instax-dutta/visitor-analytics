import type { StorageAdapter, AnalyticsRecord } from "@visitor-analytics/core";
import { cloneRecord } from "@visitor-analytics/utils";

const STORAGE_KEY = "va_records";

export class LocalStorageAdapter implements StorageAdapter {
  private readonly key: string;

  constructor(key = STORAGE_KEY) {
    this.key = key;
  }

  async save(record: AnalyticsRecord): Promise<void> {
    // NOTE: read-modify-write is not atomic. In multi-tab scenarios,
    // the last writer wins. Use IndexedDB for concurrent access.
    const records = this.readAll();
    records.push(cloneRecord(record));
    this.writeAll(records);
  }

  async saveBatch(records: readonly AnalyticsRecord[]): Promise<void> {
    // NOTE: read-modify-write is not atomic. In multi-tab scenarios,
    // the last writer wins. Use IndexedDB for concurrent access.
    const existing = this.readAll();
    for (const record of records) {
      existing.push(cloneRecord(record));
    }
    this.writeAll(existing);
  }

  async load(): Promise<readonly AnalyticsRecord[]> {
    return this.readAll();
  }

  async loadBatch(limit: number): Promise<readonly AnalyticsRecord[]> {
    const records = this.readAll();
    const batch = records.slice(0, limit);
    this.writeAll(records.slice(limit));
    return batch;
  }

  async remove(ids: readonly string[]): Promise<void> {
    const idSet = new Set(ids);
    const records = this.readAll().filter((r) => !idSet.has(r.id));
    this.writeAll(records);
  }

  async count(): Promise<number> {
    return this.readAll().length;
  }

  async clear(): Promise<void> {
    try {
      localStorage.removeItem(this.key);
    } catch {
      // localStorage may be unavailable
    }
  }

  async export(): Promise<string> {
    return JSON.stringify(this.readAll());
  }

  private readAll(): AnalyticsRecord[] {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed as AnalyticsRecord[];
    } catch {
      return [];
    }
  }

  private writeAll(records: AnalyticsRecord[]): void {
    try {
      localStorage.setItem(this.key, JSON.stringify(records));
    } catch {
      // Storage full or unavailable — silently fail
    }
  }
}
