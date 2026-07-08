import type {
  StorageAdapter,
  UploaderConfig,
  UploadPayload,
  UploadResult,
  UploadEvent,
  UploadEventHandler,
} from "@visitor-analytics/core";
import { generateShortId, requestIdle, SDK_VERSION } from "@visitor-analytics/utils";

const DEFAULT_CONFIG: UploaderConfig = {
  endpoint: "",
  batchSize: 50,
  flushInterval: 30000,
  maxRetries: 5,
  retryBaseDelay: 1000,
  retryMaxDelay: 30000,
  compressionEnabled: false,
  deduplicationEnabled: true,
  headers: {},
  timeout: 10000,
};

export class Uploader {
  private config: UploaderConfig;
  private storage: StorageAdapter;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private retryQueue: Map<string, { payload: UploadPayload; retryCount: number; nextRetryAt: number }> = new Map();
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private eventHandlers: UploadEventHandler[] = [];
  private seenBatchIds: Set<string> = new Set();
  private isUploading = false;
  private isStopped = false;

  constructor(storage: StorageAdapter, config?: Partial<UploaderConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.storage = storage;
  }

  start(): void {
    this.isStopped = false;
    if (this.config.flushInterval > 0) {
      this.flushTimer = setInterval(() => {
        requestIdle(() => this.flush());
      }, this.config.flushInterval);
    }
  }

  stop(): void {
    this.isStopped = true;
    if (this.flushTimer !== null) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.retryTimer !== null) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    this.retryQueue.clear();
  }

  onEvent(handler: UploadEventHandler): () => void {
    this.eventHandlers.push(handler);
    return () => {
      const idx = this.eventHandlers.indexOf(handler);
      if (idx !== -1) this.eventHandlers.splice(idx, 1);
    };
  }

  private emitEvent(event: UploadEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch {
        // swallow
      }
    }
  }

  async flush(): Promise<void> {
    if (this.isUploading || this.isStopped) return;

    const count = await this.storage.count();
    if (count === 0) return;

    this.isUploading = true;
    try {
      const records = await this.storage.loadBatch(this.config.batchSize);
      if (records.length === 0) return;

      const batchId = generateShortId();
      const payload: UploadPayload = {
        records,
        batchId,
        timestamp: Date.now(),
        sdkVersion: SDK_VERSION,
      };

      // Deduplication check
      if (this.config.deduplicationEnabled && this.seenBatchIds.has(batchId)) {
        return;
      }
      this.seenBatchIds.add(batchId);

      // Prune old batch IDs (keep last 1000)
      if (this.seenBatchIds.size > 1000) {
        const ids = [...this.seenBatchIds];
        const toRemove = ids.slice(0, ids.length - 1000);
        for (const id of toRemove) {
          this.seenBatchIds.delete(id);
        }
      }

      this.emitEvent({
        type: "batch-sent",
        batchId,
        recordCount: records.length,
        timestamp: Date.now(),
      });

      const result = await this.sendBatch(payload);

      if (result.success) {
        this.emitEvent({
          type: "batch-success",
          batchId,
          recordCount: records.length,
          timestamp: Date.now(),
        });
      } else if (result.retryable) {
        this.scheduleRetry(payload);
      } else {
        this.emitEvent({
          type: "batch-failed",
          batchId,
          recordCount: records.length,
          timestamp: Date.now(),
          error: result.error,
        });
      }
    } finally {
      this.isUploading = false;
    }
  }

  private async sendBatch(payload: UploadPayload): Promise<UploadResult> {
    if (!this.config.endpoint) {
      return { success: false, batchId: payload.batchId, error: "No endpoint configured", retryable: false };
    }

    const body = this.config.compressionEnabled
      ? await this.compress(JSON.stringify(payload))
      : JSON.stringify(payload);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Batch-Id": payload.batchId,
      "X-Record-Count": String(payload.records.length),
      ...this.config.headers,
    };

    if (this.config.compressionEnabled) {
      headers["Content-Encoding"] = "gzip";
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(this.config.endpoint, {
        method: "POST",
        headers,
        body,
        signal: controller.signal,
        keepalive: true,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return { success: true, batchId: payload.batchId, statusCode: response.status, retryable: false };
      }

      const retryable = response.status >= 500 || response.status === 429;
      return {
        success: false,
        batchId: payload.batchId,
        statusCode: response.status,
        error: `HTTP ${response.status}: ${response.statusText}`,
        retryable,
      };
    } catch (err) {
      clearTimeout(timeoutId);
      const error = err instanceof Error ? err.message : "Unknown error";
      return { success: false, batchId: payload.batchId, error, retryable: true };
    }
  }

  private scheduleRetry(payload: UploadPayload): void {
    const existing = this.retryQueue.get(payload.batchId);
    const retryCount = (existing?.retryCount ?? 0) + 1;

    if (retryCount > this.config.maxRetries) {
      this.retryQueue.delete(payload.batchId);
      this.emitEvent({
        type: "batch-failed",
        batchId: payload.batchId,
        recordCount: payload.records.length,
        timestamp: Date.now(),
        error: "Max retries exceeded",
        retryCount,
      });
      return;
    }

    const delay = Math.min(
      this.config.retryBaseDelay * Math.pow(2, retryCount - 1),
      this.config.retryMaxDelay
    );
    const jitter = delay * (0.5 + Math.random() * 0.5);
    const nextRetryAt = Date.now() + jitter;

    this.retryQueue.set(payload.batchId, { payload, retryCount, nextRetryAt });

    this.emitEvent({
      type: "retry-scheduled",
      batchId: payload.batchId,
      recordCount: payload.records.length,
      timestamp: Date.now(),
      retryCount,
      nextRetryAt,
    });

    this.processRetryQueue();
  }

  private processRetryQueue(): void {
    if (this.retryTimer !== null) return;

    const now = Date.now();
    let earliest = Infinity;

    for (const [batchId, entry] of this.retryQueue) {
      if (entry.nextRetryAt <= now) {
        this.retryQueue.delete(batchId);
        this.sendBatch(entry.payload).then((result) => {
          if (!result.success && result.retryable) {
            this.scheduleRetry(entry.payload);
          } else if (result.success) {
            this.emitEvent({
              type: "batch-success",
              batchId: entry.payload.batchId,
              recordCount: entry.payload.records.length,
              timestamp: Date.now(),
            });
          }
        });
      } else if (entry.nextRetryAt < earliest) {
        earliest = entry.nextRetryAt;
      }
    }

    if (earliest < Infinity) {
      this.retryTimer = setTimeout(() => {
        this.retryTimer = null;
        this.processRetryQueue();
      }, earliest - Date.now());
    }
  }

  async retryFailed(): Promise<void> {
    const entries = [...this.retryQueue.values()];
    this.retryQueue.clear();

    for (const entry of entries) {
      this.scheduleRetry(entry.payload);
    }
  }

  async sync(): Promise<void> {
    await this.flush();
  }

  private async compress(data: string): Promise<string | Blob> {
    if (typeof CompressionStream === "undefined") {
      return data;
    }
    try {
      const stream = new Blob([data]).stream().pipeThrough(new CompressionStream("gzip"));
      return new Response(stream).blob();
    } catch {
      return data;
    }
  }

  destroy(): void {
    this.stop();
    this.retryQueue.clear();
    this.eventHandlers = [];
    this.seenBatchIds.clear();
  }
}
