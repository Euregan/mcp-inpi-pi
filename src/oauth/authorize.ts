/**
 * Endpoint /authorize (RFC 6749 §4.1 + PKCE) — logique pure, sans I/O HTTP.
 *
 * PKCE (code_challenge_method=S256) est obligatoire : ce serveur ne supporte
 * que des clients publics (pas de client_secret).
 */

import { authenticate } from "../api/auth.js";
import { INPIAuthError } from "../api/types.js";
import { issueToken, readToken } from "./token-crypto.js";
import type { ClientTokenPayload } from "./types.js";

const CODE_TTL_SECONDS = 5 * 60;

export interface AuthorizeRequest {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  scope?: string;
}

export function parseAuthorizeRequest(searchParams: URLSearchParams): AuthorizeRequest {
  const responseType = searchParams.get("response_type");
  const clientId = searchParams.get("client_id");
  const redirectUri = searchParams.get("redirect_uri");
  const state = searchParams.get("state");
  const codeChallenge = searchParams.get("code_challenge");
  const codeChallengeMethod = searchParams.get("code_challenge_method");
  const scope = searchParams.get("scope") ?? undefined;

  if (responseType !== "code") {
    throw new INPIAuthError("response_type doit être 'code'");
  }
  if (!clientId || !redirectUri || !state) {
    throw new INPIAuthError("client_id, redirect_uri et state sont requis");
  }
  if (!codeChallenge || codeChallengeMethod !== "S256") {
    throw new INPIAuthError("PKCE requis : code_challenge et code_challenge_method=S256");
  }

  const { redirectUris } = readToken<ClientTokenPayload>("client", clientId);
  if (!redirectUris.includes(redirectUri)) {
    throw new INPIAuthError("redirect_uri non enregistrée pour ce client");
  }

  return { clientId, redirectUri, state, codeChallenge, scope };
}

/** Valide les identifiants INPI réellement (login live) avant d'émettre le code. */
export async function issueAuthorizationCode(
  request: AuthorizeRequest,
  credentials: { username: string; password: string }
): Promise<string> {
  await authenticate(credentials);

  return issueToken(
    "code",
    {
      username: credentials.username,
      password: credentials.password,
      codeChallenge: request.codeChallenge,
      redirectUri: request.redirectUri,
    },
    CODE_TTL_SECONDS
  );
}
