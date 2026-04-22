/**
 * Tool MCP : get_trademark_details
 *
 * Notice complète d'une marque (XML parsé → JSON plat).
 * Inclut classes, statut, titulaire, dates, événements.
 */

import type { INPIClient } from "../api/client.js";
import type { TrademarkDetails } from "../api/types.js";

const DISCLAIMER =
  "Cette analyse est indicative et ne constitue pas un avis juridique. Consultez un conseil en propriété industrielle. " +
  "Ce projet est indépendant et n'est ni affilié, ni approuvé, ni sponsorisé par l'INPI.";

/** Accepte FR4216963, EU018456789, WO1234567, ou un numéro brut. */
const TRADEMARK_NUMBER_RE = /^(?:FR|EU|WO)?\d{5,12}$/i;

function formatDetails(d: TrademarkDetails): string {
  const lines: string[] = [];

  lines.push(`Marque : ${d.mark}${d.markType ? ` (${d.markType})` : ""}`);
  lines.push(`Numéro : ${d.applicationNumber}${d.collection ? ` — ${d.collection}` : ""}`);
  lines.push(`Statut : ${d.status}`);

  if (d.classNumbers.length > 0) {
    lines.push(`Classes de Nice : ${d.classNumbers.join(", ")}`);
  }

  if (d.applicationDate) lines.push(`Date de dépôt : ${d.applicationDate}`);
  if (d.registrationDate) lines.push(`Date d'enregistrement : ${d.registrationDate}`);
  if (d.expiryDate) lines.push(`Date d'expiration : ${d.expiryDate}`);

  if (d.holders.length > 0) {
    lines.push("");
    lines.push("Titulaire(s) :");
    for (const h of d.holders) {
      const id = h.identifier ? ` (${h.identifier})` : "";
      const country = h.country ? ` — ${h.country}` : "";
      lines.push(`  • ${h.name}${id}${country}`);
    }
  }

  if (d.events.length > 0) {
    lines.push("");
    lines.push("Événements :");
    for (const e of d.events) {
      const desc = e.description ? ` — ${e.description}` : "";
      lines.push(`  • ${e.date} : ${e.type}${desc}`);
    }
  }

  return lines.join("\n");
}

export interface DetailsToolParams {
  trademark_number: string;
}

export async function handleDetailsTool(
  params: DetailsToolParams,
  client: INPIClient
): Promise<{ content: { type: "text"; text: string }[] }> {
  const num = params.trademark_number?.trim();

  if (!num || !TRADEMARK_NUMBER_RE.test(num)) {
    return {
      content: [
        {
          type: "text",
          text: "Erreur : numéro de marque invalide. Format attendu : FR4216963, EU018456789 ou WO1234567.",
        },
      ],
    };
  }

  const details = await client.getNotice(num);

  const text = [formatDetails(details), "", DISCLAIMER].join("\n");

  return {
    content: [{ type: "text", text }],
  };
}
