import type { Collector, CollectorContext, BrowserData } from "@visitor-analytics-sdk/core";
import { SDK_VERSION } from "@visitor-analytics-sdk/utils";

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

  // H1: Improved UA parser with proper detection order
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

    // Order matters: check specific browsers before generic ones

    // Headless browsers
    const isHeadless = ua.includes("HeadlessChrome") || ua.includes("Headless");

    // Firefox (check before Chrome since some Fx clones include "Chrome/")
    if (ua.includes("Firefox/") && !ua.includes("Seamonkey")) {
      name = "Firefox";
      const match = ua.match(/Firefox\/([\d.]+)/);
      version = match?.[1] ?? "0";
      engine = "Gecko";
    }
    // Edge (must be before Chrome)
    else if (ua.includes("Edg/")) {
      name = "Edge";
      const match = ua.match(/Edg\/([\d.]+)/);
      version = match?.[1] ?? "0";
      engine = "Blink";
    }
    // Opera (must be before Chrome)
    else if (ua.includes("OPR/") || ua.includes("Opera")) {
      name = "Opera";
      const match = ua.match(/(?:OPR|Opera)\/([\d.]+)/);
      version = match?.[1] ?? "0";
      engine = "Blink";
    }
    // Samsung Internet
    else if (ua.includes("SamsungBrowser/")) {
      name = "Samsung Internet";
      const match = ua.match(/SamsungBrowser\/([\d.]+)/);
      version = match?.[1] ?? "0";
      engine = "Blink";
    }
    // UC Browser
    else if (ua.includes("UCBrowser/") || ua.includes("UCWEB")) {
      name = "UC Browser";
      const match = ua.match(/(?:UCBrowser|UCWEB)\/([\d.]+)/);
      version = match?.[1] ?? "0";
      engine = "Blink";
    }
    // Opera Mini
    else if (ua.includes("Opera Mini/")) {
      name = "Opera Mini";
      const match = ua.match(/Opera Mini\/([\d.]+)/);
      version = match?.[1] ?? "0";
      engine = "Presto";
    }
    // Chrome on iOS (check before Safari - contains both "Safari/" and "CriOS/")
    else if (ua.includes("CriOS/")) {
      name = "Chrome";
      const match = ua.match(/CriOS\/([\d.]+)/);
      version = match?.[1] ?? "0";
      engine = "WebKit"; // iOS Chrome uses WebKit
    }
    // Chrome on desktop / Android
    else if (ua.includes("Chrome/") && !ua.includes("Edg/") && !ua.includes("OPR/")) {
      name = "Chrome";
      const match = ua.match(/Chrome\/([\d.]+)/);
      version = match?.[1] ?? "0";
      engine = "Blink";
    }
    // Safari (must be after all Chrome checks)
    else if (ua.includes("Safari/") && !ua.includes("Chrome/") && !ua.includes("Chromium")) {
      name = "Safari";
      const match = ua.match(/Version\/([\d.]+)/);
      version = match?.[1] ?? "0";
      engine = "WebKit";
    }
    // Internet Explorer
    else if (ua.includes("MSIE") || ua.includes("Trident/")) {
      name = "Internet Explorer";
      const match = ua.match(/(?:MSIE |Trident\/.*rv:)([\d.]+)/);
      version = match?.[1] ?? "0";
      engine = "Trident";
    }

    // Append headless indicator
    if (isHeadless && name !== "unknown") {
      name += " (headless)";
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
