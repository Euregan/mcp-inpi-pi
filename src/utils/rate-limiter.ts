/**
 * Rate limiter interne — token bucket double (par minute + par heure).
 *
 * Paramétrable via env vars :
 * - INPI_MAX_REQUESTS_PER_MINUTE (défaut 30)
 * - INPI_MAX_REQUESTS_PER_HOUR   (défaut 500)
 *
 * Requêtes servies depuis le cache exclues du budget (appeler bypass()).
 * Quand limite atteinte → throw INPIRateLimitError avec retryAfterMs.
 */

import { INPIRateLimitError } from "../api/types.js";

interface Bucket {
  capacity: number;
  tokens: number;
  refillRateMs: number; // ms par token
  lastRefillAt: number; // timestamp ms
}

function makeBucket(capacity: number, windowMs: number): Bucket {
  return {
    capacity,
    tokens: capacity,
    refillRateMs: windowMs / capacity,
    lastRefillAt: Date.now(),
  };
}

function refill(bucket: Bucket, now: number): void {
  const elapsed = now - bucket.lastRefillAt;
  const tokensToAdd = Math.floor(elapsed / bucket.refillRateMs);
  if (tokensToAdd > 0) {
    bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefillAt += tokensToAdd * bucket.refillRateMs;
  }
}

/** Retourne le délai en ms avant qu'un token soit disponible dans ce bucket. */
function retryAfter(bucket: Bucket, now: number): number {
  if (bucket.tokens >= 1) return 0;
  const tokensNeeded = 1 - bucket.tokens;
  return Math.ceil(tokensNeeded * bucket.refillRateMs - (now - bucket.lastRefillAt));
}

export class RateLimiter {
  private minuteBucket: Bucket;
  private hourBucket: Bucket;

  constructor(
    maxPerMinute = Number(process.env.INPI_MAX_REQUESTS_PER_MINUTE ?? 30),
    maxPerHour = Number(process.env.INPI_MAX_REQUESTS_PER_HOUR ?? 500)
  ) {
    this.minuteBucket = makeBucket(maxPerMinute, 60_000);
    this.hourBucket = makeBucket(maxPerHour, 3_600_000);
  }

  /**
   * Consomme un token des deux buckets.
   * Lève INPIRateLimitError si l'un des deux est vide.
   */
  consume(): void {
    const now = Date.now();
    refill(this.minuteBucket, now);
    refill(this.hourBucket, now);

    const minuteWait = retryAfter(this.minuteBucket, now);
    const hourWait = retryAfter(this.hourBucket, now);
    const wait = Math.max(minuteWait, hourWait);

    if (wait > 0) {
      const which = minuteWait >= hourWait ? "minute" : "heure";
      throw new INPIRateLimitError(
        `Limite de requêtes atteinte (par ${which}). Réessayez dans ${Math.ceil(wait / 1000)}s.`,
        wait
      );
    }

    this.minuteBucket.tokens -= 1;
    this.hourBucket.tokens -= 1;
  }

  /** Nombre de tokens restants [par minute, par heure]. */
  remaining(): [number, number] {
    const now = Date.now();
    refill(this.minuteBucket, now);
    refill(this.hourBucket, now);
    return [Math.floor(this.minuteBucket.tokens), Math.floor(this.hourBucket.tokens)];
  }
}

/** Instance partagée (singleton process). */
export const rateLimiter = new RateLimiter();
