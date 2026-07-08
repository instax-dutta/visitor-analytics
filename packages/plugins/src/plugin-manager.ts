import type { Plugin, PluginContext, Collector, AnalyticsEvent } from "@visitor-analytics/core";
import { EventBus } from "@visitor-analytics/core";

export class PluginManager {
  private readonly installedPlugins = new Map<string, Plugin>();
  private readonly collectors = new Map<string, Collector>();
  private readonly eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  install(plugin: Plugin, context: PluginContext): void {
    if (this.installedPlugins.has(plugin.name)) {
      return; // Already installed
    }

    plugin.install(context);
    this.installedPlugins.set(plugin.name, plugin);

    this.eventBus.emit("plugin-installed", plugin.name);
  }

  uninstall(pluginName: string, context: PluginContext): void {
    const plugin = this.installedPlugins.get(pluginName);
    if (!plugin) return;

    plugin.uninstall?.(context);
    this.installedPlugins.delete(pluginName);

    this.eventBus.emit("plugin-uninstalled", pluginName);
  }

  has(pluginName: string): boolean {
    return this.installedPlugins.has(pluginName);
  }

  get(pluginName: string): Plugin | undefined {
    return this.installedPlugins.get(pluginName);
  }

  getAll(): readonly Plugin[] {
    return [...this.installedPlugins.values()];
  }

  addCollector(collector: Collector): void {
    if (this.collectors.has(collector.name)) {
      return;
    }
    this.collectors.set(collector.name, collector);
    this.eventBus.emit("collector-registered", collector.name);
  }

  removeCollector(name: string): void {
    if (!this.collectors.has(name)) return;
    this.collectors.delete(name);
    this.eventBus.emit("collector-removed", name);
  }

  getCollectors(): readonly Collector[] {
    return [...this.collectors.values()];
  }

  getCollector(name: string): Collector | undefined {
    return this.collectors.get(name);
  }
}

export function createPluginContext(
  addCollector: (c: Collector) => void,
  removeCollector: (name: string) => void,
  eventBus: EventBus,
  getConfig: PluginContext["getConfig"]
): PluginContext {
  return {
    addCollector,
    removeCollector,
    on: (event: AnalyticsEvent, handler: (...args: readonly unknown[]) => void) => {
      eventBus.on(event, handler);
    },
    off: (event: AnalyticsEvent, handler: (...args: readonly unknown[]) => void) => {
      eventBus.off(event, handler);
    },
    getConfig,
  };
}
