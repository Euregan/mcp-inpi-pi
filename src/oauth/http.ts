/**
 * Petits utilitaires HTTP partagés par les endpoints OAuth (api/oauth-*.ts).
 */

import type { OAuthError } from "@modelcontextprotocol/sdk/server/auth/errors.js";

export const OAUTH_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...OAUTH_CORS_HEADERS },
  });
}

export function oauthErrorResponse(error: OAuthError, status: number): Response {
  return jsonResponse(error.toResponseObject(), status);
}
