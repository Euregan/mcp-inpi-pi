/**
 * Tool MCP : search_trademarks
 *
 * Recherche de marques dans la base INPI (FR, EU, WO).
 * Traduit les paramètres user-friendly en requête SolR.
 */

import type { INPIClient } from "../api/client.js";
import type { SearchParams, TrademarkSearchResult } from "../api/types.js";

const DISCLAIMER =
  "Cette analyse est indicative et ne constitue pas un avis juridique. Consultez un conseil en propriété industrielle. " +
  "Ce projet est indépendant et n'est ni affilié, ni approuvé, ni sponsorisé par l'INPI.";

function formatResult(r: TrademarkSearchResult): string {
  const classes = r.classNumbers.length > 0 ? `Classes : ${r.classNumbers.join(", ")}` : "Classes : —";
  return `• ${r.mark} (${r.applicationNumber}) — ${r.status}\n  Titulaire : ${r.holder || "—"} | ${classes}`;
}

export interface SearchToolParams {
  query: string;
  nice_classes?: number[];
  collections?: ("FR" | "EU" | "WO")[];
  active_only?: boolean;
  holder?: string;
  limit?: number;
}

export async function handleSearchTool(
  params: SearchToolParams,
  client: INPIClient
): Promise<{ content: { type: "text"; text: string }[] }> {
  const query = params.query?.trim();
  if (!query) {
    return {
      content: [{ type: "text", text: "Erreur : le paramètre `query` est requis et ne peut pas être vide." }],
    };
  }

  const searchParams: SearchParams = {
    query,
    niceClasses: params.nice_classes,
    collections: params.collections,
    activeOnly: params.active_only ?? true,
    holder: params.holder,
    limit: params.limit,
  };

  const response = await client.search(searchParams);

  if (response.results.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: `Aucune marque trouvée pour « ${query} ».\n\n${DISCLAIMER}`,
        },
      ],
    };
  }

  const lines = [
    `${response.total} marque(s) trouvée(s) pour « ${query} » (affichage : ${response.results.length}) :`,
    "",
    ...response.results.map(formatResult),
    "",
    DISCLAIMER,
  ];

  return {
    content: [{ type: "text", text: lines.join("\n") }],
  };
}
