// ─── Shared Event Types ──────────────────────────────────────────────────────

export type AnalyticsEvent =
  | "start"
  | "stop"
  | "flush"
  | "sync"
  | "record-collected"
  | "batch-uploaded"
  | "batch-failed"
  | "error"
  | "collector-registered"
  | "collector-removed"
  | "plugin-installed"
  | "plugin-uninstalled"
  | "storage-saved"
  | "storage-loaded"
  | "config-changed";

// ─── Storage Types ───────────────────────────────────────────────────────────

export type StorageType = "memory" | "localstorage" | "indexeddb";
