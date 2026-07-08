import type { Collector, CollectorContext, BrowserData } from "@visitor-analytics/core";
import { SDK_VERSION } from "@visitor-analytics/utils";

export class BrowserCollector implements Collector {
  readonly name = "browser";
  readonly category = "browser" as const;
  readonly version = SDK_VERSION;
  enabled = true;

  private includeUserAgent: boolean;

  constructor(options?: { includeUserAgent?: boolean }) {
    this.includeUserAgent = options?.includeUserAgent ?? false;
  }

  async collect(context: CollectorContext): Promise<{ browser: BrowserData }> {
    const nav = context.navigator;

    const ua = nav.userAgent;
    const parsed = this.parseUA(ua);

    return {
      browser: {
        name: parsed.name,
        version: parsed.version,
        engine: parsed.engine,
        engineVersion: parsed.engineVersion,
        userAgent: this.includeUserAgent ? ua : "",
        language: nav.language,
        cookiesEnabled: nav.cookieEnabled,
        javaScriptEnabled: true,
        doNotTrack: nav.doNotTrack,
      },
    };
  }

  private parseUA(ua: string): {
    name: string;
    version: string;
    engine: string;
    engineVersion: string;
  } {
    let name = "unknown";
    let version = "0";
    let engine = "unknown";
    let engineVersion = "0";

    // Browser detection
    if (ua.includes("Firefox/") && !ua.includes("Seamonkey")) {
      name = "Firefox";
      const match = ua.match(/Firefox\/([\d.]+)/);
      version = match?.[1] ?? "0";
      engine = "Gecko";
    } else if (ua.includes("Edg/")) {
      name = "Edge";
      const match = ua.match(/Edg\/([\d.]+)/);
      version = match?.[1] ?? "0";
      engine = "Blink";
    } else if (ua.includes("OPR/") || ua.includes("Opera")) {
      name = "Opera";
      const match = ua.match(/(?:OPR|Opera)\/([\d.]+)/);
      version = match?.[1] ?? "0";
      engine = "Blink";
    } else if (ua.includes("Chrome/") && !ua.includes("Edg/")) {
      name = "Chrome";
      const match = ua.match(/Chrome\/([\d.]+)/);
      version = match?.[1] ?? "0";
      engine = "Blink";
    } else if (
      ua.includes("Safari/") &&
      !ua.includes("Chrome/") &&
      !ua.includes("Chromium")
    ) {
      name = "Safari";
      const match = ua.match(/Version\/([\d.]+)/);
      version = match?.[1] ?? "0";
      engine = "WebKit";
    } else if (ua.includes("MSIE") || ua.includes("Trident/")) {
      name = "Internet Explorer";
      const match = ua.match(/(?:MSIE |Trident\/.*rv:)([\d.]+)/);
      version = match?.[1] ?? "0";
      engine = "Trident";
    }

    // Engine version
    if (engine === "Blink") {
      const match = ua.match(/AppleWebKit\/([\d.]+)/);
      engineVersion = match?.[1] ?? "0";
    } else if (engine === "Gecko") {
      const match = ua.match(/Gecko\/([\d.]+)/);
      engineVersion = match?.[1] ?? "20100101";
    } else if (engine === "WebKit") {
      const match = ua.match(/AppleWebKit\/([\d.]+)/);
      engineVersion = match?.[1] ?? "0";
    } else if (engine === "Trident") {
      const match = ua.match(/Trident\/([\d.]+)/);
      engineVersion = match?.[1] ?? "0";
    }

    return { name, version, engine, engineVersion };
  }

  async destroy(): Promise<void> {
    // no-op
  }
}
