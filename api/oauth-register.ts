/**
 * mcp-inpi-pi — OAuth Dynamic Client Registration (RFC 7591).
 * Monté sur /register via vercel.json (rewrites).
 */

import { InvalidClientMetadataError } from "@modelcontextprotocol/sdk/server/auth/errors.js";
import { registerClient } from "../src/oauth/register.js";
import { jsonResponse, oauthErrorResponse, OAUTH_CORS_HEADERS } from "../src/oauth/http.js";
import { INPIAuthError } from "../src/api/types.js";

async function handleRegister(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return oauthErrorResponse(new InvalidClientMetadataError("Corps JSON invalide"), 400);
  }

  try {
    const registration = registerClient(body as Record<string, unknown>);
    return jsonResponse(registration, 201);
  } catch (err) {
    const message = err instanceof INPIAuthError ? err.message : "Requête invalide";
    return oauthErrorResponse(new InvalidClientMetadataError(message), 400);
  }
}

function handleOptions(): Response {
  return new Response(null, { status: 204, headers: OAUTH_CORS_HEADERS });
}

export { handleRegister as POST, handleOptions as OPTIONS };
