import type { Collector, CollectorContext, InteractionData } from "@visitor-analytics/core";
import { SDK_VERSION } from "@visitor-analytics/utils";

export interface InteractionState {
  sessionStart: number;
  pageStart: number;
  routeChanges: number;
  scrollDepth: number;
  clickCount: number;
  resizeCount: number;
  visibilityChanges: number;
  focusChanges: number;
  landingPage: string;
  lastPage: string;
  utmParams: {
    source: string | null;
    medium: string | null;
    campaign: string | null;
    term: string | null;
    content: string | null;
  };
}

export class InteractionCollector implements Collector {
  readonly name = "interaction";
  readonly category = "interaction" as const;
  readonly version = SDK_VERSION;
  enabled = true;

  private state: InteractionState;
  private cleanupFns: Array<() => void> = [];
  private sessionTimeout: ReturnType<typeof setTimeout> | null = null;
  private sessionTimeoutMs: number;

  constructor(options?: { sessionTimeout?: number }) {
    this.sessionTimeoutMs = options?.sessionTimeout ?? 30 * 60 * 1000; // 30 minutes
    this.state = this.createInitialState();
  }

  private createInitialState(): InteractionState {
    return {
      sessionStart: Date.now(),
      pageStart: Date.now(),
      routeChanges: 0,
      scrollDepth: 0,
      clickCount: 0,
      resizeCount: 0,
      visibilityChanges: 0,
      focusChanges: 0,
      landingPage: typeof location !== "undefined" ? location.href : "",
      lastPage: typeof location !== "undefined" ? location.href : "",
      utmParams: this.parseUTMParams(),
    };
  }

  private parseUTMParams(): InteractionState["utmParams"] {
    if (typeof location === "undefined") {
      return { source: null, medium: null, campaign: null, term: null, content: null };
    }
    const params = new URLSearchParams(location.search);
    return {
      source: params.get("utm_source"),
      medium: params.get("utm_medium"),
      campaign: params.get("utm_campaign"),
      term: params.get("utm_term"),
      content: params.get("utm_content"),
    };
  }

  async init(context: CollectorContext): Promise<void> {
    const win = context.window;
    const doc = context.document;

    // Click counter (passive, non-tracking — just counts)
    const clickHandler = () => {
      this.state.clickCount++;
      this.resetSessionTimeout();
    };
    doc.addEventListener("click", clickHandler, { passive: true });
    this.cleanupFns.push(() => doc.removeEventListener("click", clickHandler));

    // Scroll depth (debounced)
    let scrollRaf: number | null = null;
    const scrollHandler = () => {
      if (scrollRaf !== null) return;
      scrollRaf = requestAnimationFrame(() => {
        const maxScroll = Math.max(
          doc.documentElement.scrollHeight - win.innerHeight,
          1
        );
        const currentScroll = (win as unknown as { scrollY?: number }).scrollY ?? 0;
        const depth = Math.min(Math.round((currentScroll / maxScroll) * 100), 100);
        if (depth > this.state.scrollDepth) {
          this.state.scrollDepth = depth;
        }
        scrollRaf = null;
      });
    };
    win.addEventListener("scroll", scrollHandler as EventListener, { passive: true });
    this.cleanupFns.push(() => win.removeEventListener("scroll", scrollHandler as EventListener));

    // Resize counter
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const resizeHandler = () => {
      if (resizeTimer !== null) return;
      resizeTimer = setTimeout(() => {
        this.state.resizeCount++;
        resizeTimer = null;
      }, 200);
    };
    win.addEventListener("resize", resizeHandler, { passive: true });
    this.cleanupFns.push(() => {
      win.removeEventListener("resize", resizeHandler);
      if (resizeTimer !== null) clearTimeout(resizeTimer);
    });

    // Visibility changes
    const visHandler = () => {
      this.state.visibilityChanges++;
    };
    doc.addEventListener("visibilitychange", visHandler, { passive: true });
    this.cleanupFns.push(() => doc.removeEventListener("visibilitychange", visHandler));

    // Focus changes
    const focusHandler = () => {
      this.state.focusChanges++;
    };
    win.addEventListener("focus", focusHandler, { passive: true });
    win.addEventListener("blur", focusHandler, { passive: true });
    this.cleanupFns.push(() => {
      win.removeEventListener("focus", focusHandler);
      win.removeEventListener("blur", focusHandler);
    });

    // Route changes — listen to popstate only, avoid monkey-patching history
    const onPopState = () => {
      this.state.routeChanges++;
      this.state.lastPage = location.href;
    };
    win.addEventListener("popstate", onPopState, { passive: true });
    this.cleanupFns.push(() => {
      win.removeEventListener("popstate", onPopState);
    });

    this.startSessionTimeout();
  }

  private startSessionTimeout(): void {
    this.sessionTimeout = setTimeout(() => {
      this.state.sessionStart = Date.now();
      this.state.routeChanges = 0;
      this.state.clickCount = 0;
      this.state.resizeCount = 0;
      this.state.visibilityChanges = 0;
      this.state.focusChanges = 0;
      this.state.scrollDepth = 0;
    }, this.sessionTimeoutMs);
  }

  private resetSessionTimeout(): void {
    if (this.sessionTimeout !== null) {
      clearTimeout(this.sessionTimeout);
    }
    this.startSessionTimeout();
  }

  async collect(_context: CollectorContext): Promise<{ interaction: InteractionData }> {
    const now = Date.now();
    return {
      interaction: {
        sessionDuration: now - this.state.sessionStart,
        timeOnPage: now - this.state.pageStart,
        routeChanges: this.state.routeChanges,
        scrollDepth: this.state.scrollDepth,
        clickCount: this.state.clickCount,
        resizeCount: this.state.resizeCount,
        visibilityChanges: this.state.visibilityChanges,
        focusChanges: this.state.focusChanges,
        landingPage: this.state.landingPage,
        exitPage: this.state.lastPage,
        utmSource: this.state.utmParams.source,
        utmMedium: this.state.utmParams.medium,
        utmCampaign: this.state.utmParams.campaign,
        utmTerm: this.state.utmParams.term,
        utmContent: this.state.utmParams.content,
      },
    };
  }

  async destroy(): Promise<void> {
    if (this.sessionTimeout !== null) {
      clearTimeout(this.sessionTimeout);
    }
    for (const fn of this.cleanupFns) {
      fn();
    }
    this.cleanupFns = [];
  }
}
