/**
 * Client HTTP pour l'API INPI Marques.
 *
 * Orchestre auth + requêtes. Gère le re-auth automatique sur 401.
 * Base URL : https://api-gateway.inpi.fr/services/apidiffusion/api/marques/
 */

import type { INPICredentials, INPISession, SearchParams, SearchResponse, TrademarkDetails } from "./types.js";
import { INPISearchError } from "./types.js";
import { authenticate } from "./auth.js";
import { buildSearchBody } from "./query-builder.js";
import { parseSearchXml, parseNoticeXml } from "./xml-parser.js";
import { rateLimiter } from "../utils/rate-limiter.js";
import { searchCache, noticeCache } from "../utils/cache.js";

const BASE_URL = "https://api-gateway.inpi.fr/services/apidiffusion/api/marques";
const TIMEOUT_MS = 15_000;

export class INPIClient {
  private session: INPISession | null = null;

  constructor(private readonly credentials: INPICredentials) {}

  private async ensureSession(): Promise<INPISession> {
    if (!this.session) {
      this.session = await authenticate(this.credentials);
    }
    return this.session;
  }

  private authHeaders(session: INPISession, accept = "application/json"): Record<string, string> {
    return {
      Authorization: `Bearer ${session.accessToken}`,
      "X-XSRF-TOKEN": session.xsrfToken,
      "Content-Type": "application/json",
      Accept: accept,
      Cookie: session.sessionCookie,
    };
  }

  private async fetchWithAuth(
    url: string,
    init: RequestInit,
    accept = "application/json"
  ): Promise<Response> {
    rateLimiter.consume();
    const session = await this.ensureSession();
    const response = await fetch(url, {
      ...init,
      headers: { ...this.authHeaders(session, accept), ...(init.headers as Record<string, string> ?? {}) },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (response.status === 401) {
      // Re-auth et retry une fois
      this.session = await authenticate(this.credentials);
      return fetch(url, {
        ...init,
        headers: { ...this.authHeaders(this.session, accept), ...(init.headers as Record<string, string> ?? {}) },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    }

    return response;
  }

  async search(params: SearchParams): Promise<SearchResponse> {
    const body = buildSearchBody(params);
    const cacheKey = JSON.stringify(body);

    const cached = searchCache.get(cacheKey);
    if (cached) return cached;

    const response = await this.fetchWithAuth(
      `${BASE_URL}/search`,
      { method: "POST", body: JSON.stringify(body) },
      "application/xml"
    );

    if (!response.ok) {
      throw new INPISearchError(`Échec de la recherche INPI (HTTP ${response.status})`);
    }

    const result = parseSearchXml(await response.text());
    searchCache.set(cacheKey, result);
    return result;
  }

  async getNotice(trademarkNumber: string): Promise<TrademarkDetails> {
    const num = trademarkNumber.toUpperCase();

    const cached = noticeCache.get(num);
    if (cached) return cached;

    const response = await this.fetchWithAuth(
      `${BASE_URL}/notice/${encodeURIComponent(num)}`,
      { method: "GET" },
      "application/xml"
    );

    if (!response.ok) {
      throw new INPISearchError(
        `Notice introuvable pour ${trademarkNumber} (HTTP ${response.status})`
      );
    }

    const result = parseNoticeXml(await response.text());
    noticeCache.set(num, result);
    return result;
  }

}
