/**
 * mcp-inpi-pi — OAuth Token endpoint (RFC 6749 §4.1.3 / §6).
 * Monté sur /token via vercel.json (rewrites).
 */

import {
  OAuthError,
  InvalidRequestError,
  UnsupportedGrantTypeError,
  InvalidGrantError,
} from "@modelcontextprotocol/sdk/server/auth/errors.js";
import { exchangeAuthorizationCode, exchangeRefreshToken } from "../src/oauth/token.js";
import { jsonResponse, oauthErrorResponse, OAUTH_CORS_HEADERS } from "../src/oauth/http.js";
import { INPIAuthError } from "../src/api/types.js";
import { methodRouter } from "../src/utils/http.js";

async function POST(req: Request): Promise<Response> {
  const form = new URLSearchParams(await req.text());
  const grantType = form.get("grant_type");

  try {
    if (grantType === "authorization_code") {
      const code = form.get("code");
      const redirectUri = form.get("redirect_uri");
      const codeVerifier = form.get("code_verifier");
      if (!code || !redirectUri || !codeVerifier) {
        throw new InvalidRequestError("code, redirect_uri et code_verifier sont requis");
      }
      return jsonResponse(await exchangeAuthorizationCode({ code, redirectUri, codeVerifier }));
    }

    if (grantType === "refresh_token") {
      const refreshToken = form.get("refresh_token");
      if (!refreshToken) {
        throw new InvalidRequestError("refresh_token requis");
      }
      return jsonResponse(exchangeRefreshToken(refreshToken));
    }

    throw new UnsupportedGrantTypeError(`grant_type non supporté : ${grantType}`);
  } catch (err) {
    if (err instanceof INPIAuthError) {
      return oauthErrorResponse(new InvalidGrantError(err.message), 400);
    }
    if (err instanceof OAuthError) {
      return oauthErrorResponse(err, 400);
    }
    return oauthErrorResponse(new InvalidGrantError("Erreur inattendue"), 400);
  }
}

function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: OAUTH_CORS_HEADERS });
}

export default methodRouter({ POST, OPTIONS });
