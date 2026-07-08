import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventBus } from "../packages/core/src/event-bus.ts";

describe("EventBus", () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  it("should register and emit events", () => {
    const handler = vi.fn();
    bus.on("start", handler);
    bus.emit("start");
    expect(handler).toHaveBeenCalledOnce();
  });

  it("should pass arguments to handlers", () => {
    const handler = vi.fn();
    bus.on("record-collected", handler);
    bus.emit("record-collected", { id: "1" });
    expect(handler).toHaveBeenCalledWith({ id: "1" });
  });

  it("should support multiple handlers for same event", () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    bus.on("start", h1);
    bus.on("start", h2);
    bus.emit("start");
    expect(h1).toHaveBeenCalledOnce();
    expect(h2).toHaveBeenCalledOnce();
  });

  it("should remove specific handlers with off", () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    bus.on("start", h1);
    bus.on("start", h2);
    bus.off("start", h1);
    bus.emit("start");
    expect(h1).not.toHaveBeenCalled();
    expect(h2).toHaveBeenCalledOnce();
  });

  it("should remove all listeners for an event", () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    bus.on("start", h1);
    bus.on("stop", h2);
    bus.removeAllListeners("start");
    bus.emit("start");
    bus.emit("stop");
    expect(h1).not.toHaveBeenCalled();
    expect(h2).toHaveBeenCalledOnce();
  });

  it("should remove all listeners when no event specified", () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    bus.on("start", h1);
    bus.on("stop", h2);
    bus.removeAllListeners();
    bus.emit("start");
    bus.emit("stop");
    expect(h1).not.toHaveBeenCalled();
    expect(h2).not.toHaveBeenCalled();
  });

  it("should return correct listener count", () => {
    expect(bus.listenerCount("start")).toBe(0);
    bus.on("start", vi.fn());
    bus.on("start", vi.fn());
    expect(bus.listenerCount("start")).toBe(2);
  });

  it("should swallow errors in handlers", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    bus.on("start", () => {
      throw new Error("test error");
    });
    const handler = vi.fn();
    bus.on("start", handler);
    bus.emit("start");
    expect(handler).toHaveBeenCalledOnce();
    consoleSpy.mockRestore();
  });
});
