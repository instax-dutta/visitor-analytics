import type { AnalyticsEvent } from "./types";

type Handler = (...args: readonly unknown[]) => void;

export class EventBus {
  private readonly listeners = new Map<AnalyticsEvent, Set<Handler>>();

  on(event: AnalyticsEvent, handler: Handler): void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(handler);
  }

  off(event: AnalyticsEvent, handler: Handler): void {
    this.listeners.get(event)?.delete(handler);
  }

  emit(event: AnalyticsEvent, ...args: readonly unknown[]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const handler of set) {
      try {
        handler(...args);
      } catch (_err) {
        // Swallow listener errors to prevent cascading failures
      }
    }
  }

  removeAllListeners(event?: AnalyticsEvent): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  listenerCount(event: AnalyticsEvent): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}
