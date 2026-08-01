/**
 * mcp-inpi-pi — Métadonnées serveur d'autorisation (RFC 8414).
 * Monté sur /.well-known/oauth-authorization-server via vercel.json (rewrites).
 */

import { getPublicOrigin } from "mcp-handler";
import { jsonResponse, OAUTH_CORS_HEADERS } from "../src/oauth/http.js";

export function GET(req: Request): Response {
  const origin = getPublicOrigin(req);

  return jsonResponse({
    issuer: origin,
    authorization_endpoint: `${origin}/authorize`,
    token_endpoint: `${origin}/token`,
    registration_endpoint: `${origin}/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
  });
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: OAUTH_CORS_HEADERS });
}
