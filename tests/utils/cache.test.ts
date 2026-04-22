import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TTLCache } from "../../src/utils/cache.js";

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe("TTLCache", () => {
  it("retourne la valeur avant expiration", () => {
    const cache = new TTLCache<string>(1000);
    cache.set("k", "v");
    expect(cache.get("k")).toBe("v");
  });

  it("retourne undefined après expiration", () => {
    const cache = new TTLCache<string>(1000);
    cache.set("k", "v");
    vi.advanceTimersByTime(1100);
    expect(cache.get("k")).toBeUndefined();
  });

  it("has() reflète l'état TTL", () => {
    const cache = new TTLCache<number>(500);
    cache.set("x", 42);
    expect(cache.has("x")).toBe(true);
    vi.advanceTimersByTime(600);
    expect(cache.has("x")).toBe(false);
  });

  it("écrase une entrée existante", () => {
    const cache = new TTLCache<string>(1000);
    cache.set("k", "v1");
    cache.set("k", "v2");
    expect(cache.get("k")).toBe("v2");
  });

  it("purge() supprime les entrées expirées", () => {
    const cache = new TTLCache<string>(500);
    cache.set("a", "1");
    cache.set("b", "2");
    vi.advanceTimersByTime(600);
    cache.purge();
    expect(cache.size).toBe(0);
  });
});
