import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RateLimiter } from "../../src/utils/rate-limiter.js";
import { INPIRateLimitError } from "../../src/api/types.js";

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe("RateLimiter", () => {
  it("autorise les requêtes dans la limite", () => {
    const rl = new RateLimiter(5, 100);
    expect(() => { for (let i = 0; i < 5; i++) rl.consume(); }).not.toThrow();
  });

  it("lève INPIRateLimitError quand la limite par minute est atteinte", () => {
    const rl = new RateLimiter(3, 1000);
    rl.consume(); rl.consume(); rl.consume();
    expect(() => rl.consume()).toThrow(INPIRateLimitError);
  });

  it("inclut retryAfterMs positif dans l'erreur", () => {
    const rl = new RateLimiter(1, 1000);
    rl.consume();
    try {
      rl.consume();
      expect.fail("devait lever une erreur");
    } catch (e) {
      expect(e).toBeInstanceOf(INPIRateLimitError);
      expect((e as INPIRateLimitError).retryAfterMs).toBeGreaterThan(0);
    }
  });

  it("recharge les tokens après l'écoulement du temps", () => {
    // 60 req/min → refillRateMs = 60000/60 = 1000 ms/token
    const rl = new RateLimiter(60, 3600);
    for (let i = 0; i < 60; i++) rl.consume();
    expect(() => rl.consume()).toThrow(INPIRateLimitError);

    // Avance de 1100ms → 1 token rechargé
    vi.advanceTimersByTime(1100);
    expect(() => rl.consume()).not.toThrow();
  });

  it("remaining() retourne les tokens disponibles", () => {
    const rl = new RateLimiter(10, 100);
    rl.consume(); rl.consume();
    const [perMin] = rl.remaining();
    expect(perMin).toBe(8);
  });
});
