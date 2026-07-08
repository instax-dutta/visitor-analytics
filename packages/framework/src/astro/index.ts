import { createAnalytics } from "@visitor-analytics/core";
import type { AnalyticsConfigPartial, VisitorAnalyticsInstance } from "@visitor-analytics/core";

export function createAstroAnalytics(config: AnalyticsConfigPartial): VisitorAnalyticsInstance {
  const analytics = createAnalytics(config);

  if (typeof window !== "undefined") {
    analytics.start();
  }

  return analytics;
}

export function getAnalyticsScript(config: AnalyticsConfigPartial): string {
  const safeConfig = JSON.stringify({
    endpoint: config.endpoint ?? "",
    storage: config.storage ?? "memory",
    autoStart: true,
    batchSize: config.batchSize ?? 50,
    flushInterval: config.flushInterval ?? 30000,
  });

  return `<script type="module">import{createAnalytics}from"@visitor-analytics/core";createAnalytics(${safeConfig})</script>`;
}
