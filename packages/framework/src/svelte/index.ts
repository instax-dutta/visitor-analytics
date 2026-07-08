import { createAnalytics } from "@visitor-analytics-sdk/core";
import type { AnalyticsConfigPartial, VisitorAnalyticsInstance, AnalyticsRecord } from "@visitor-analytics-sdk/core";

// ─── Store Interface ─────────────────────────────────────────────────────────

interface Readable<T> {
  subscribe(fn: (value: T) => void): () => void;
}

function writable<T>(initial: T): { subscribe: (fn: (v: T) => void) => () => void; set: (v: T) => void; update: (fn: (v: T) => T) => void } {
  let value = initial;
  const subscribers = new Set<(v: T) => void>();

  return {
    subscribe(fn: (v: T) => void) {
      fn(value);
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
    set(v: T) {
      value = v;
      for (const fn of subscribers) fn(value);
    },
    update(fn: (v: T) => T) {
      value = fn(value);
      for (const fn of subscribers) fn(value);
    },
  };
}

// ─── Create Analytics Store ──────────────────────────────────────────────────

export function createAnalyticsStore(config: AnalyticsConfigPartial): {
  analytics: VisitorAnalyticsInstance;
  data: Readable<readonly AnalyticsRecord[]>;
  start: () => void;
  stop: () => void;
  flush: () => Promise<void>;
  destroy: () => Promise<void>;
} {
  const analytics = createAnalytics({ ...config, autoStart: false });
  const dataStore = writable<readonly AnalyticsRecord[]>([]);

  const refresh = async () => {
    const records = await analytics.getCollectedData();
    dataStore.set(records);
  };

  return {
    analytics,
    data: { subscribe: dataStore.subscribe },
    start: () => {
      analytics.start();
      refresh();
    },
    stop: () => analytics.stop(),
    flush: async () => {
      await analytics.flush();
      await refresh();
    },
    destroy: async () => {
      await analytics.destroy();
    },
  };
}

// ─── Svelte Action ───────────────────────────────────────────────────────────

export function analyticsAction(
  _node: HTMLElement,
  config: AnalyticsConfigPartial
): { destroy: () => void } {
  const analytics = createAnalytics(config);
  analytics.start();

  return {
    destroy() {
      analytics.destroy();
    },
  };
}
