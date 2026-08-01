/**
 * Enregistrement dynamique de client OAuth (RFC 7591).
 *
 * Sans base de données : le client_id EST un token chiffré portant les
 * redirect_uris enregistrées (voir token-crypto.ts). Client public (PKCE),
 * pas de client_secret.
 */

import { issueToken } from "./token-crypto.js";
import { INPIAuthError } from "../api/types.js";

const CLIENT_TTL_SECONDS = 365 * 24 * 60 * 60; // 1 an

export interface ClientRegistration {
  client_id: string;
  client_id_issued_at: number;
  redirect_uris: string[];
  token_endpoint_auth_method: "none";
  grant_types: string[];
  response_types: string[];
  client_name?: string;
}

function isAllowedRedirectUri(uri: string): boolean {
  let url: URL;
  try {
    url = new URL(uri);
  } catch {
    return false;
  }
  if (url.protocol === "https:") return true;
  return url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
}

export function registerClient(body: Record<string, unknown>): ClientRegistration {
  const redirectUris = body.redirect_uris;

  if (
    !Array.isArray(redirectUris) ||
    redirectUris.length === 0 ||
    !redirectUris.every((uri) => typeof uri === "string" && isAllowedRedirectUri(uri))
  ) {
    throw new INPIAuthError(
      "redirect_uris requis : tableau non vide d'URLs https (ou http://localhost)"
    );
  }

  const clientId = issueToken("client", { redirectUris }, CLIENT_TTL_SECONDS);

  return {
    client_id: clientId,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    redirect_uris: redirectUris,
    token_endpoint_auth_method: "none",
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    ...(typeof body.client_name === "string" ? { client_name: body.client_name } : {}),
  };
}
