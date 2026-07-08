import { describe, it, expect } from "vitest";
import {
  generateId,
  generateShortId,
  debounce,
  throttle,
  safeCall,
  safeCallAsync,
  isBrowser,
  noop,
  padZero,
} from "../packages/utils/src/index.ts";

describe("Utils", () => {
  describe("generateId", () => {
    it("should generate unique IDs", () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });

    it("should generate UUID format", () => {
      const id = generateId();
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
      );
    });
  });

  describe("generateShortId", () => {
    it("should generate short ID", () => {
      const id = generateShortId();
      expect(id).toHaveLength(16);
      expect(id).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe("debounce", () => {
    it("should debounce function calls", async () => {
      let callCount = 0;
      const fn = () => { callCount++; };
      const debounced = debounce(fn, 50);

      debounced();
      debounced();
      debounced();

      expect(callCount).toBe(0);

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(callCount).toBe(1);
    });

    it("should have cancel method", async () => {
      let callCount = 0;
      const fn = () => { callCount++; };
      const debounced = debounce(fn, 50);

      debounced();
      debounced.cancel();

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(callCount).toBe(0);
    });
  });

  describe("throttle", () => {
    it("should throttle function calls", async () => {
      let callCount = 0;
      const fn = () => { callCount++; };
      const throttled = throttle(fn, 50);

      throttled();
      throttled();
      throttled();

      expect(callCount).toBe(1);

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(callCount).toBe(2);
    });

    it("should have cancel method", async () => {
      let callCount = 0;
      const fn = () => { callCount++; };
      const throttled = throttle(fn, 50);

      throttled();
      throttled.cancel();

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(callCount).toBe(1);
    });
  });

  describe("safeCall", () => {
    it("should return function result", () => {
      expect(safeCall(() => 42, 0)).toBe(42);
    });

    it("should return fallback on error", () => {
      expect(
        safeCall(() => {
          throw new Error("test");
        }, 0)
      ).toBe(0);
    });
  });

  describe("safeCallAsync", () => {
    it("should return async function result", async () => {
      expect(await safeCallAsync(async () => 42, 0)).toBe(42);
    });

    it("should return fallback on error", async () => {
      expect(
        await safeCallAsync(async () => {
          throw new Error("test");
        }, 0)
      ).toBe(0);
    });
  });

  describe("isBrowser", () => {
    it("should detect browser environment", () => {
      // In test environment with jsdom, this should be true
      expect(typeof isBrowser()).toBe("boolean");
    });
  });

  describe("noop", () => {
    it("should be a no-op function", () => {
      expect(noop()).toBeUndefined();
    });
  });

  describe("padZero", () => {
    it("should pad single digits", () => {
      expect(padZero(0)).toBe("00");
      expect(padZero(5)).toBe("05");
      expect(padZero(9)).toBe("09");
    });

    it("should not pad double digits", () => {
      expect(padZero(10)).toBe("10");
      expect(padZero(23)).toBe("23");
    });
  });
});
