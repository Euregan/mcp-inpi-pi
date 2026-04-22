/**
 * Constructeur de requêtes SolR pour l'API INPI.
 *
 * Traduit des paramètres user-friendly en syntaxe SolR INPI :
 *   { query: "FreshMeal", niceClasses: [29, 43], activeOnly: true }
 *   → "[Mark=FRESHMEAL] ET [ClassNumber=(29 OU 43)] ET [ExpiryDate=20260402:99991231]"
 *
 * IMPORTANT : les termes doivent être en MAJUSCULES.
 * Opérateurs : ET, OU, SAUF — Jokers : ? (0-1 char), * (0-n chars)
 */

import type { SearchParams } from "./types.js";

/** "[Mark=TERM]" — terme converti en majuscules */
export function buildMarkQuery(term: string): string {
  return `[Mark=${term.toUpperCase()}]`;
}

/** "[ClassNumber=(9 OU 16)]" ou "[ClassNumber=9]" si une seule classe */
export function buildClassFilter(classes: number[]): string {
  if (classes.length === 1) {
    return `[ClassNumber=${classes[0]}]`;
  }
  return `[ClassNumber=(${classes.join(" OU ")})]`;
}

/** "[ExpiryDate=YYYYMMDD:99991231]" avec la date du jour */
export function buildActiveFilter(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `[ExpiryDate=${y}${m}${d}:99991231]`;
}

/** "[(DEPOSANT OU DEPOTIT)=NAME]" — cherche dans déposant ET titulaire */
export function buildHolderFilter(name: string): string {
  return `[(DEPOSANT OU DEPOTIT)=${name.toUpperCase()}]`;
}

/**
 * Compose tous les filtres actifs avec ET.
 * Exemple : "[Mark=FRESHMEAL] ET [ClassNumber=(29 OU 43)] ET [ExpiryDate=20260402:99991231]"
 */
export function buildSearchQuery(params: SearchParams): string {
  const parts: string[] = [];

  parts.push(buildMarkQuery(params.query));

  if (params.niceClasses && params.niceClasses.length > 0) {
    parts.push(buildClassFilter(params.niceClasses));
  }

  if (params.activeOnly !== false) {
    parts.push(buildActiveFilter());
  }

  if (params.holder) {
    parts.push(buildHolderFilter(params.holder));
  }

  return parts.join(" ET ");
}

/** Corps complet pour POST /marques/search */
export function buildSearchBody(params: SearchParams): {
  collections: string[];
  query: string;
  size: number;
  position: number;
} {
  return {
    collections: params.collections ?? ["FR", "EU", "WO"],
    query: buildSearchQuery(params),
    size: Math.min(params.limit ?? 20, 200),
    position: params.position ?? 0,
  };
}
