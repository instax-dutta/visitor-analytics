import type { Collector, CollectorContext, DeviceData, DeviceFormFactor, TouchSupport } from "@visitor-analytics-sdk/core";
import { SDK_VERSION } from "@visitor-analytics-sdk/utils";

export class DeviceCollector implements Collector {
  readonly name = "device";
  readonly category = "device" as const;
  readonly version = SDK_VERSION;
  enabled = true;

  async collect(context: CollectorContext): Promise<{ device: DeviceData }> {
    const nav = context.navigator;
    const win = context.window;
    const scr = context.screen;

    return {
      device: {
        os: this.detectOS(nav.platform, nav.userAgent),
        osVersion: this.detectOSVersion(nav.userAgent),
        platform: nav.platform,
        architecture: this.detectArch(nav.userAgent),
        formFactor: this.detectFormFactor(nav.userAgent, scr),
        screenWidth: scr.width,
        screenHeight: scr.height,
        viewportWidth: win.innerWidth,
        viewportHeight: win.innerHeight,
        devicePixelRatio: win.devicePixelRatio,
        colorDepth: scr.colorDepth,
        orientation: scr.orientation?.type ?? "portrait-primary",
        touchSupport: this.detectTouch(nav.maxTouchPoints),
        hardwareConcurrency: nav.hardwareConcurrency,
        maxTouchPoints: nav.maxTouchPoints,
      },
    };
  }

  private detectOS(platform: string, ua: string): string {
    if (platform.includes("Win")) return "Windows";
    if (platform.includes("Mac")) return "macOS";
    if (platform.includes("Linux")) return "Linux";
    if (platform.includes("Android")) return "Android";
    if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
    if (ua.includes("Chrome OS")) return "Chrome OS";
    if (ua.includes("X11") || ua.includes("Linux")) return "Linux";
    return "Unknown";
  }

  private detectOSVersion(ua: string): string {
    const windowsMatch = ua.match(/Windows NT ([\d.]+)/);
    if (windowsMatch) {
      const versions: Record<string, string> = {
        "10.0": "10/11",
        "6.3": "8.1",
        "6.2": "8",
        "6.1": "7",
        "6.0": "Vista",
      };
      const ver = windowsMatch[1] ?? "";
      return versions[ver] ?? ver;
    }

    const macMatch = ua.match(/Mac OS X ([\d_]+)/);
    if (macMatch) return (macMatch[1] ?? "").replace(/_/g, ".");

    const androidMatch = ua.match(/Android ([\d.]+)/);
    if (androidMatch) return androidMatch[1] ?? "";

    const iosMatch = ua.match(/OS ([\d_]+)/);
    if (iosMatch) return (iosMatch[1] ?? "").replace(/_/g, ".");

    return "unknown";
  }

  private detectArch(ua: string): string {
    if (ua.includes("x86_64") || ua.includes("x64") || ua.includes("Win64") || ua.includes("x86-64")) {
      return "x86_64";
    }
    if (ua.includes("arm64") || ua.includes("aarch64")) return "arm64";
    if (ua.includes("arm")) return "arm";
    if (ua.includes("x86")) return "x86";
    if (ua.includes("WOW64")) return "x86_64";
    return "unknown";
  }

  private detectFormFactor(ua: string, scr: { width: number; height: number }): DeviceFormFactor {
    if (/iPhone|iPod/.test(ua)) return "mobile";
    if (/iPad/.test(ua)) return "tablet";
    if (/Android/.test(ua)) {
      if (scr.width < 768) return "mobile";
      if (scr.width < 1024) return "tablet";
      return "mobile";
    }
    if (/SmartTV|AppleTV|Chromecast|FireTV|Roku/.test(ua)) return "smarttv";
    if (/Watch|Wearable|Fitbit/.test(ua)) return "wearable";
    if (/PlayStation|Xbox|Nintendo/.test(ua)) return "console";

    // Desktop heuristic
    if (scr.width >= 1024 && !("ontouchstart" in globalThis)) return "desktop";

    return "unknown";
  }

  private detectTouch(maxTouchPoints: number): TouchSupport {
    if (maxTouchPoints === 0) return "none";
    if (maxTouchPoints <= 5) return "coarse";
    return "fine";
  }

  async destroy(): Promise<void> {
    // no-op
  }
}
