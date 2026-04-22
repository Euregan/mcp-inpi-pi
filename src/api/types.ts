/**
 * Types LLM-facing — ce que le MCP retourne aux tools, pas les types bruts INPI.
 */

// --- Auth ---

export interface INPICredentials {
  username: string;
  password: string;
}

export interface INPISession {
  xsrfToken: string;
  accessToken: string;
  /** Cookie header à renvoyer sur les requêtes API (XSRF + cookies de session login) */
  sessionCookie: string;
}

// --- Search ---

export interface SearchParams {
  query: string;
  collections?: ("FR" | "EU" | "WO")[];
  niceClasses?: number[];
  activeOnly?: boolean;
  holder?: string;
  limit?: number;
  position?: number;
}

/** Résultat de recherche sanitizé pour le LLM. */
export interface TrademarkSearchResult {
  applicationNumber: string;
  mark: string;
  classNumbers: number[];
  status: string;
  holder: string;
  collection?: string;
  /** Clé unique INPI */
  ukey?: string;
}

export interface SearchResponse {
  results: TrademarkSearchResult[];
  total: number;
  position: number;
}

// --- Notice (détails) ---

/** Notice complète parsée (XML → JSON plat). */
export interface TrademarkDetails {
  applicationNumber: string;
  mark: string;
  markType?: string;
  classNumbers: number[];
  status: string;
  holders: TrademarkHolder[];
  applicationDate?: string;
  registrationDate?: string;
  expiryDate?: string;
  events: TrademarkEvent[];
  /** Collection d'origine : FR, EU, WO */
  collection?: string;
}

export interface TrademarkHolder {
  name: string;
  identifier?: string;
  country?: string;
}

export interface TrademarkEvent {
  type: string;
  date: string;
  description?: string;
}

// --- Availability / Scoring ---

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface AvailabilityResult {
  riskLevel: RiskLevel;
  matches: TrademarkSearchResult[];
  explanation: string;
}

// --- Errors ---

export class INPIAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "INPIAuthError";
  }
}

export class INPISearchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "INPISearchError";
  }
}

export class INPIRateLimitError extends Error {
  retryAfterMs: number;
  constructor(message: string, retryAfterMs: number) {
    super(message);
    this.name = "INPIRateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}
