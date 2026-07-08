import { createSignal, onCleanup, createEffect, type JSX } from "solid-js";
import { createAnalytics } from "@visitor-analytics-sdk/core";
import type { AnalyticsConfigPartial, VisitorAnalyticsInstance, AnalyticsRecord } from "@visitor-analytics-sdk/core";

// ─── createAnalytics Hook ───────────────────────────────────────────────────

export function createAnalyticsHook(config: AnalyticsConfigPartial): {
  analytics: VisitorAnalyticsInstance;
  data: () => readonly AnalyticsRecord[];
  start: () => void;
  stop: () => void;
  flush: () => Promise<void>;
} {
  const analytics = createAnalytics({ ...config, autoStart: false });
  const [data, setData] = createSignal<readonly AnalyticsRecord[]>([]);

  const refresh = async () => {
    const records = await analytics.getCollectedData();
    setData(records);
  };

  createEffect(() => {
    analytics.start();
    refresh();

    onCleanup(() => {
      analytics.destroy();
    });
  });

  return {
    analytics,
    data,
    start: () => analytics.start(),
    stop: () => analytics.stop(),
    flush: async () => {
      await analytics.flush();
      await refresh();
    },
  };
}

// ─── Provider Component ─────────────────────────────────────────────────────

export function AnalyticsProvider(config: AnalyticsConfigPartial & { children: JSX.Element }): JSX.Element {
  const { children, ...cfg } = config;
  createAnalyticsHook(cfg);
  return children;
}
