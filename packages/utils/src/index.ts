export const SDK_VERSION = "1.0.0";

export function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function generateShortId(): string {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  return generateId().replace(/-/g, "").slice(0, 16);
}

export function debounce<T extends (...args: readonly unknown[]) => void>(
  fn: T,
  delay: number
): T & { cancel(): void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const debounced = (...args: Parameters<T>) => {
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      fn(...args);
      timer = null;
    }, delay);
  };
  debounced.cancel = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };
  return debounced as T & { cancel(): void };
}

export function throttle<T extends (...args: readonly unknown[]) => void>(
  fn: T,
  limit: number
): T & { cancel(): void } {
  let inThrottle = false;
  let lastArgs: Parameters<T> | null = null;
  const throttled = (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          fn(...lastArgs);
          lastArgs = null;
        }
      }, limit);
    } else {
      lastArgs = args;
    }
  };
  throttled.cancel = () => {
    inThrottle = false;
    lastArgs = null;
  };
  return throttled as T & { cancel(): void };
}

export function safeCall<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export async function safeCallAsync<T>(
  fn: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export function requestIdle(
  callback: () => void,
  timeout = 5000
): void {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    (window as { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback(callback, { timeout });
  } else {
    setTimeout(callback, 0);
  }
}

export function deepFreeze<T extends object>(obj: T): Readonly<T> {
  Object.freeze(obj);
  for (const key of Object.keys(obj)) {
    const val = (obj as Record<string, unknown>)[key];
    if (val !== null && typeof val === "object" && !Object.isFrozen(val)) {
      deepFreeze(val as object);
    }
  }
  return obj as Readonly<T>;
}

export function cloneRecord<T>(record: T): T {
  return JSON.parse(JSON.stringify(record)) as T;
}

export function isBrowser(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof document !== "undefined" &&
    typeof navigator !== "undefined"
  );
}

export function noop(): void {
  // intentionally empty
}

export function padZero(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}
