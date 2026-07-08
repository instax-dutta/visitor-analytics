import { useState, useEffect, useCallback, useRef, createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { createAnalytics } from "@visitor-analytics-sdk/core";
import type { AnalyticsConfigPartial, VisitorAnalyticsInstance, AnalyticsRecord, AnalyticsEvent } from "@visitor-analytics-sdk/core";

// ─── Context ─────────────────────────────────────────────────────────────────

interface AnalyticsContextValue {
  analytics: VisitorAnalyticsInstance | null;
  isStarted: boolean;
}

const AnalyticsContext = createContext<AnalyticsContextValue>({
  analytics: null,
  isStarted: false,
});

export function useAnalyticsContext(): AnalyticsContextValue {
  return useContext(AnalyticsContext);
}

// ─── Provider ────────────────────────────────────────────────────────────────

interface AnalyticsProviderProps {
  config: AnalyticsConfigPartial;
  children: ReactNode;
}

export function AnalyticsProvider({ config, children }: AnalyticsProviderProps) {
  const analyticsRef = useRef<VisitorAnalyticsInstance | null>(null);
  const [isStarted, setIsStarted] = useState(false);

  if (!analyticsRef.current) {
    analyticsRef.current = createAnalytics({ ...config, autoStart: false });
  }

  const analytics = analyticsRef.current;

  useEffect(() => {
    analytics.start();
    setIsStarted(true);

    return () => {
      analytics.destroy();
      analyticsRef.current = null;
    };
  }, [analytics]);

  const value = useMemo(
    () => ({ analytics, isStarted }),
    [analytics, isStarted]
  );

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
}

// ─── useAnalytics Hook ──────────────────────────────────────────────────────

export function useAnalytics(): VisitorAnalyticsInstance {
  const { analytics } = useAnalyticsContext();
  if (!analytics) {
    throw new Error("useAnalytics must be used within an AnalyticsProvider");
  }
  return analytics;
}

// ─── useAnalyticsEvent Hook ─────────────────────────────────────────────────

export function useAnalyticsEvent(
  event: AnalyticsEvent,
  handler: (...args: readonly unknown[]) => void
): void {
  const analytics = useAnalytics();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const wrappedHandler = (...args: readonly unknown[]) => handlerRef.current(...args);
    analytics.on(event, wrappedHandler);
    return () => {
      analytics.off(event, wrappedHandler);
    };
  }, [analytics, event]);
}

// ─── usePageView Hook (M4) ──────────────────────────────────────────────────
// Automatically tracks page views on pathname changes.
// Usage: call from a layout component with usePathname() or similar.

export function usePageView(getPathname: () => string): void {
  const analytics = useAnalytics();
  const lastPathRef = useRef<string>("");

  useEffect(() => {
    const currentPath = getPathname();
    if (currentPath !== lastPathRef.current) {
      lastPathRef.current = currentPath;
      analytics.trackRouteChange(currentPath);
    }
  }, [analytics, getPathname]);
}

// ─── useCollectedData Hook ──────────────────────────────────────────────────

export function useCollectedData(): {
  data: readonly AnalyticsRecord[];
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const analytics = useAnalytics();
  const [data, setData] = useState<readonly AnalyticsRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const records = await analytics.getCollectedData();
      setData(records);
    } finally {
      setLoading(false);
    }
  }, [analytics]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, refresh };
}

// ─── useAnalyticsExport Hook ────────────────────────────────────────────────

export function useAnalyticsExport(): {
  exportData: () => Promise<string>;
  data: string | null;
  loading: boolean;
} {
  const analytics = useAnalytics();
  const [data, setData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const exportData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await analytics.export();
      setData(result);
      return result;
    } finally {
      setLoading(false);
    }
  }, [analytics]);

  return { exportData, data, loading };
}
