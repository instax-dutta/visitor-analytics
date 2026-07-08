import { ref, onMounted, onUnmounted, inject, type App, type InjectionKey, type Ref } from "vue";
import { createAnalytics } from "@visitor-analytics-sdk/core";
import type { AnalyticsConfigPartial, VisitorAnalyticsInstance, AnalyticsRecord, AnalyticsEvent } from "@visitor-analytics-sdk/core";

export const AnalyticsKey: InjectionKey<VisitorAnalyticsInstance> = Symbol("analytics");

export function createAnalyticsPlugin(config: AnalyticsConfigPartial) {
  return {
    install(app: App) {
      const analytics = createAnalytics(config);
      app.provide(AnalyticsKey, analytics);
      app.config.globalProperties.$analytics = analytics;

      // Start immediately -- lifecycle hooks must be called during setup(),
      // not inside plugin.install(). The analytics instance is safe to start
      // at plugin registration time since it doesn't depend on component lifecycle.
      analytics.start();

      app.config.globalProperties.$analyticsCleanup = () => {
        analytics.destroy();
      };
    },
  };
}

export function useAnalytics(): VisitorAnalyticsInstance {
  const analytics = inject(AnalyticsKey);
  if (!analytics) {
    throw new Error("useAnalytics() must be used within an AnalyticsProvider");
  }
  return analytics;
}

export function useAnalyticsEvent(
  event: AnalyticsEvent,
  handler: (...args: readonly unknown[]) => void
): void {
  const analytics = useAnalytics();

  onMounted(() => {
    analytics.on(event, handler);
  });

  onUnmounted(() => {
    analytics.off(event, handler);
  });
}

export function useCollectedData(): {
  data: Ref<readonly AnalyticsRecord[]>;
  loading: Ref<boolean>;
  refresh: () => Promise<void>;
} {
  const analytics = useAnalytics();
  const data = ref<readonly AnalyticsRecord[]>([]) as Ref<readonly AnalyticsRecord[]>;
  const loading = ref(true);

  const refresh = async () => {
    loading.value = true;
    try {
      data.value = await analytics.getCollectedData();
    } finally {
      loading.value = false;
    }
  };

  onMounted(() => {
    refresh();
  });

  return { data, loading, refresh };
}
