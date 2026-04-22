/**
 * Cache en mémoire TTL simple (Map + timestamps).
 *
 * Cible : résultats de recherche et notices récents.
 * Les requêtes servies depuis le cache sont exclues du budget rate limiter.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class TTLCache<T> {
  private store = new Map<string, CacheEntry<T>>();

  constructor(private readonly ttlMs: number) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T): void {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /** Supprime les entrées expirées (nettoyage optionnel). */
  purge(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) this.store.delete(key);
    }
  }

  get size(): number {
    return this.store.size;
  }
}

// TTL par type de ressource
const SEARCH_TTL_MS  = 5  * 60 * 1_000; //  5 min — résultats de recherche
const NOTICE_TTL_MS  = 30 * 60 * 1_000; // 30 min — notices (moins volatiles)

import type { SearchResponse, TrademarkDetails } from "../api/types.js";

export const searchCache = new TTLCache<SearchResponse>(SEARCH_TTL_MS);
export const noticeCache  = new TTLCache<TrademarkDetails>(NOTICE_TTL_MS);
