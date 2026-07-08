import { describe, it, expect, vi, beforeEach } from "vitest";
import { PluginManager, createPluginContext } from "../packages/plugins/src/plugin-manager.ts";
import { EventBus } from "../packages/core/src/event-bus.ts";
import type { Plugin, Collector } from "../packages/core/src/types.ts";

function createMockPlugin(name: string): Plugin {
  return {
    name,
    version: "1.0.0",
    description: `Mock plugin ${name}`,
    install: vi.fn(),
    uninstall: vi.fn(),
  };
}

function createMockCollector(name: string): Collector {
  return {
    name,
    category: "custom",
    version: "1.0.0",
    enabled: true,
    collect: vi.fn().mockResolvedValue({}),
  };
}

describe("PluginManager", () => {
  let manager: PluginManager;
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
    manager = new PluginManager(eventBus);
  });

  it("should install a plugin", () => {
    const plugin = createMockPlugin("test-plugin");
    const context = createPluginContext(
      vi.fn(),
      vi.fn(),
      eventBus,
      () => ({ endpoint: "" })
    );

    manager.install(plugin, context);

    expect(manager.has("test-plugin")).toBe(true);
    expect(plugin.install).toHaveBeenCalledWith(context);
  });

  it("should not install duplicate plugins", () => {
    const plugin = createMockPlugin("test-plugin");
    const context = createPluginContext(
      vi.fn(),
      vi.fn(),
      eventBus,
      () => ({ endpoint: "" })
    );

    manager.install(plugin, context);
    manager.install(plugin, context);

    expect(plugin.install).toHaveBeenCalledTimes(1);
  });

  it("should uninstall a plugin", () => {
    const plugin = createMockPlugin("test-plugin");
    const context = createPluginContext(
      vi.fn(),
      vi.fn(),
      eventBus,
      () => ({ endpoint: "" })
    );

    manager.install(plugin, context);
    manager.uninstall("test-plugin", context);

    expect(manager.has("test-plugin")).toBe(false);
    expect(plugin.uninstall).toHaveBeenCalledWith(context);
  });

  it("should emit plugin-installed event", () => {
    const handler = vi.fn();
    eventBus.on("plugin-installed", handler);

    const plugin = createMockPlugin("test-plugin");
    const context = createPluginContext(
      vi.fn(),
      vi.fn(),
      eventBus,
      () => ({ endpoint: "" })
    );

    manager.install(plugin, context);

    expect(handler).toHaveBeenCalledWith("test-plugin");
  });

  it("should add and remove collectors", () => {
    const collector = createMockCollector("test-collector");

    manager.addCollector(collector);
    expect(manager.has("test-collector")).toBe(false);
    expect(manager.getCollectors()).toHaveLength(1);
    expect(manager.getCollector("test-collector")).toBe(collector);

    manager.removeCollector("test-collector");
    expect(manager.getCollectors()).toHaveLength(0);
  });

  it("should not add duplicate collectors", () => {
    const collector = createMockCollector("test-collector");
    manager.addCollector(collector);
    manager.addCollector(collector);
    expect(manager.getCollectors()).toHaveLength(1);
  });

  it("should get all installed plugins", () => {
    const p1 = createMockPlugin("p1");
    const p2 = createMockPlugin("p2");
    const context = createPluginContext(
      vi.fn(),
      vi.fn(),
      eventBus,
      () => ({ endpoint: "" })
    );

    manager.install(p1, context);
    manager.install(p2, context);

    const all = manager.getAll();
    expect(all).toHaveLength(2);
    expect(all.map((p) => p.name)).toContain("p1");
    expect(all.map((p) => p.name)).toContain("p2");
  });
});
