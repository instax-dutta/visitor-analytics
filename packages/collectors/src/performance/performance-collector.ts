import type { Collector, CollectorContext, PerformanceData, NavigationTiming, PaintTiming, PerformanceLike } from "@visitor-analytics-sdk/core";
import { safeCall, SDK_VERSION } from "@visitor-analytics-sdk/utils";

export class PerformanceCollector implements Collector {
  readonly name = "performance";
  readonly category = "performance" as const;
  readonly version = SDK_VERSION;
  enabled = true;

  async collect(context: CollectorContext): Promise<{ performance: PerformanceData }> {
    const perf = context.performance;
    const nav = context.navigator;

    const connection = (nav as unknown as { connection?: { type?: string; effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean } }).connection;

    return {
      performance: {
        navigationTiming: this.collectNavigationTiming(perf),
        paintTiming: this.collectPaintTiming(perf),
        largestContentfulPaint: this.collectLCP(perf),
        firstContentfulPaint: this.collectFCP(perf),
        cumulativeLayoutShift: this.collectCLS(perf),
        interactionToNextPaint: this.collectINP(perf),
        deviceMemory: nav.deviceMemory ?? null,
        networkType: connection?.type ?? "unknown",
        effectiveType: connection?.effectiveType ?? "unknown",
        downlink: connection?.downlink ?? null,
        rtt: connection?.rtt ?? null,
        saveData: connection?.saveData ?? false,
      },
    };
  }

  private collectNavigationTiming(perf: PerformanceLike): NavigationTiming | null {
    const timing = (perf as unknown as { timing?: PerformanceTiming }).timing;
    if (!timing) return null;

    return safeCall(() => ({
      redirectTime: timing.redirectEnd - timing.redirectStart,
      dnsLookupTime: timing.domainLookupEnd - timing.domainLookupStart,
      tcpConnectTime: timing.connectEnd - timing.connectStart,
      requestTime: timing.responseStart - timing.requestStart,
      responseTime: timing.responseEnd - timing.responseStart,
      domInteractiveTime: timing.domInteractive - timing.navigationStart,
      domContentLoadedTime: timing.domContentLoadedEventEnd - timing.navigationStart,
      domCompleteTime: timing.domComplete - timing.navigationStart,
      loadTime: timing.loadEventEnd - timing.navigationStart,
      duration: timing.loadEventEnd - timing.navigationStart,
    }), null);
  }

  private collectPaintTiming(perf: PerformanceLike): PaintTiming | null {
    const entries = perf.getEntriesByType("paint") as readonly { name: string; startTime: number }[];
    if (!entries.length) return null;

    const fp = entries.find((e: { name: string }) => e.name === "first-paint");
    const fcp = entries.find((e: { name: string }) => e.name === "first-contentful-paint");

    if (!fp && !fcp) return null;

    return {
      firstPaint: fp?.startTime ?? 0,
      firstContentfulPaint: fcp?.startTime ?? 0,
    };
  }

  private collectLCP(perf: PerformanceLike): number | null {
    const entries = perf.getEntriesByType("largest-contentful-paint") as readonly { startTime: number }[];
    if (!entries.length) return null;
    const last = entries[entries.length - 1];
    return last ? last.startTime : null;
  }

  private collectFCP(perf: PerformanceLike): number | null {
    const entries = perf.getEntriesByType("paint") as readonly { name: string; startTime: number }[];
    const fcp = entries.find((e: { name: string }) => e.name === "first-contentful-paint");
    return fcp?.startTime ?? null;
  }

  private collectCLS(perf: PerformanceLike): number | null {
    const entries = perf.getEntriesByType("layout-shift") as readonly { hadRecentInput?: boolean; value?: number }[];
    if (!entries.length) return null;
    let cls = 0;
    for (const entry of entries) {
      if (!entry.hadRecentInput && entry.value !== undefined) {
        cls += entry.value;
      }
    }
    return cls;
  }

  private collectINP(perf: PerformanceLike): number | null {
    const entries = perf.getEntriesByType("event") as readonly { duration: number }[];
    if (!entries.length) return null;
    const durations = entries.map((e: { duration: number }) => e.duration).sort((a: number, b: number) => b - a);
    return durations[0] ?? null;
  }

  async destroy(): Promise<void> {
    // no-op
  }
}
