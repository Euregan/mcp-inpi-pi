/**
 * Disclaimers ajoutés à chaque réponse de tool.
 */

export const LEGAL_DISCLAIMER =
  "Cette analyse est indicative et ne constitue pas un avis juridique. Consultez un conseil en propriété industrielle.";

export const AFFILIATION_DISCLAIMER =
  "Ce projet est indépendant et n'est ni affilié, ni approuvé, ni sponsorisé par l'INPI.";

/** Formate le bloc disclaimer à ajouter en fin de réponse tool. */
export function formatDisclaimer(): string {
  return `\n---\n${LEGAL_DISCLAIMER}\n${AFFILIATION_DISCLAIMER}`;
}
