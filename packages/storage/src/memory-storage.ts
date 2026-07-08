import type { StorageAdapter, AnalyticsRecord } from "@visitor-analytics/core";
import { cloneRecord } from "@visitor-analytics/utils";

export class MemoryStorage implements StorageAdapter {
  private records: AnalyticsRecord[] = [];

  async save(record: AnalyticsRecord): Promise<void> {
    this.records.push(cloneRecord(record));
  }

  async saveBatch(records: readonly AnalyticsRecord[]): Promise<void> {
    for (const record of records) {
      this.records.push(cloneRecord(record));
    }
  }

  async load(): Promise<readonly AnalyticsRecord[]> {
    return this.records.map((r) => cloneRecord(r));
  }

  async loadBatch(limit: number): Promise<readonly AnalyticsRecord[]> {
    return this.records.splice(0, limit);
  }

  async remove(ids: readonly string[]): Promise<void> {
    const idSet = new Set(ids);
    this.records = this.records.filter((r) => !idSet.has(r.id));
  }

  async count(): Promise<number> {
    return this.records.length;
  }

  async clear(): Promise<void> {
    this.records = [];
  }

  async export(): Promise<string> {
    return JSON.stringify(this.records);
  }
}
