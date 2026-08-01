/**
 * Endpoint /token (RFC 6749 §4.1.3 + §6, PKCE RFC 7636) — logique pure.
 */

import { verifyChallenge } from "pkce-challenge";
import { issueToken, readToken } from "./token-crypto.js";
import { INPIAuthError } from "../api/types.js";
import type { AuthorizationCodePayload, CredentialTokenPayload } from "./types.js";

const ACCESS_TTL_SECONDS = 60 * 60; // 1h — expiration courte, renouvelée via refresh_token
const REFRESH_TTL_SECONDS = 90 * 24 * 60 * 60; // 90 jours

export interface TokenResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token: string;
}

function issueTokenPair(credentials: { username: string; password: string }): TokenResponse {
  return {
    access_token: issueToken("access", credentials, ACCESS_TTL_SECONDS),
    token_type: "Bearer",
    expires_in: ACCESS_TTL_SECONDS,
    refresh_token: issueToken("refresh", credentials, REFRESH_TTL_SECONDS),
  };
}

export async function exchangeAuthorizationCode(params: {
  code: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<TokenResponse> {
  const payload = readToken<AuthorizationCodePayload>("code", params.code);

  if (payload.redirectUri !== params.redirectUri) {
    throw new INPIAuthError("redirect_uri ne correspond pas au code d'autorisation");
  }

  const valid = await verifyChallenge(params.codeVerifier, payload.codeChallenge);
  if (!valid) {
    throw new INPIAuthError("code_verifier invalide (PKCE)");
  }

  return issueTokenPair({ username: payload.username, password: payload.password });
}

export function exchangeRefreshToken(refreshToken: string): TokenResponse {
  const payload = readToken<CredentialTokenPayload>("refresh", refreshToken);
  return issueTokenPair({ username: payload.username, password: payload.password });
}
