import type { Collector, CollectorContext, EnvironmentData } from "@visitor-analytics/core";
import { safeCall, SDK_VERSION } from "@visitor-analytics/utils";

export class EnvironmentCollector implements Collector {
  readonly name = "environment";
  readonly category = "environment" as const;
  readonly version = SDK_VERSION;
  enabled = true;

  async collect(context: CollectorContext): Promise<{ environment: EnvironmentData }> {
    const win = context.window;
    const nav = context.navigator;
    const doc = context.document;

    return {
      environment: {
        timezone: this.getTimezone(),
        timezoneOffset: new Date().getTimezoneOffset(),
        languages: [...nav.languages],
        language: nav.language,
        locale: this.getLocale(),
        prefersColorScheme: this.getColorScheme(win),
        prefersReducedMotion: this.getReducedMotion(win),
        prefersContrast: this.getContrast(win),
        colorGamut: this.getColorGamut(win),
        hdr: this.getHDR(win),
        localStorageSupport: this.checkStorage(win.localStorage),
        sessionStorageSupport: this.checkStorage(win.sessionStorage),
        indexedDBSupport: this.checkIndexedDB(win.indexedDB),
        cookieSupport: doc.cookie !== undefined,
        cacheAPISupport: this.checkCacheAPI(win),
      },
    };
  }

  private getTimezone(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "UTC";
    }
  }

  private getLocale(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().locale;
    } catch {
      return "en-US";
    }
  }

  private getColorScheme(win: WindowLike): "light" | "dark" | "no-preference" {
    if (typeof win.matchMedia !== "function") return "no-preference";
    const mql = win.matchMedia("(prefers-color-scheme: light)");
    if (mql?.matches) return "light";
    const mqlDark = win.matchMedia("(prefers-color-scheme: dark)");
    if (mqlDark?.matches) return "dark";
    return "no-preference";
  }

  private getReducedMotion(win: WindowLike): boolean {
    if (typeof win.matchMedia !== "function") return false;
    return win.matchMedia("(prefers-reduced-motion: reduce)")?.matches ?? false;
  }

  private getContrast(win: WindowLike): "no-preference" | "more" | "less" | "custom" {
    if (typeof win.matchMedia !== "function") return "no-preference";
    const mql = win.matchMedia("(prefers-contrast: more)");
    if (mql?.matches) return "more";
    const mqlLess = win.matchMedia("(prefers-contrast: less)");
    if (mqlLess?.matches) return "less";
    const mqlCustom = win.matchMedia("(prefers-contrast: custom)");
    if (mqlCustom?.matches) return "custom";
    return "no-preference";
  }

  private getColorGamut(win: WindowLike): "srgb" | "p3" | "rec2020" | "unknown" {
    if (typeof win.matchMedia !== "function") return "unknown";
    const mqlRec2020 = win.matchMedia("(color-gamut: rec2020)");
    if (mqlRec2020?.matches) return "rec2020";
    const mqlP3 = win.matchMedia("(color-gamut: p3)");
    if (mqlP3?.matches) return "p3";
    const mqlSrgb = win.matchMedia("(color-gamut: srgb)");
    if (mqlSrgb?.matches) return "srgb";
    return "unknown";
  }

  private getHDR(win: WindowLike): boolean {
    if (typeof win.matchMedia !== "function") return false;
    return win.matchMedia("(dynamic-range: high)")?.matches ?? false;
  }

  private checkStorage(storage: Storage | undefined): boolean {
    if (!storage) return false;
    return safeCall(() => typeof storage.length === "number", false);
  }

  private checkIndexedDB(idb: IDBFactory | undefined): boolean {
    if (!idb) return false;
    return typeof idb.open === "function";
  }

  private checkCacheAPI(win: WindowLike): boolean {
    return safeCall(() => {
      const w = win as unknown as { Cache?: unknown; caches?: unknown };
      return typeof w.Cache !== "undefined" && typeof w.caches !== "undefined";
    }, false);
  }

  async destroy(): Promise<void> {
    // no-op
  }
}

type WindowLike = {
  matchMedia(query: string): MediaQueryList | null;
  localStorage?: Storage;
  sessionStorage?: Storage;
  indexedDB?: IDBFactory;
};
