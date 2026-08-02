/**
 * mcp-inpi-pi — Vercel Function (Streamable HTTP transport).
 *
 * Voir https://vercel.com/docs/mcp/deploy-mcp-servers-to-vercel
 * Déployé à /api/mcp. Serveur multi-utilisateurs, deux façons de s'authentifier :
 * - En-têtes X-INPI-Username / X-INPI-Password (Claude Desktop / Claude Code CLI)
 * - OAuth (claude.ai web) : voir api/oauth-*.ts, identifiants portés par l'access token
 */

import { createMcpHandler, withMcpAuth } from "mcp-handler";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { registerCapabilities } from "../src/mcp-server.js";
import { INPIClient } from "../src/api/client.js";
import { credentialsFromAuthInfo } from "../src/api/auth.js";
import { TTLCache } from "../src/utils/cache.js";
import { readToken } from "../src/oauth/token-crypto.js";
import type { CredentialTokenPayload } from "../src/oauth/types.js";

const CLIENT_TTL_MS = 30 * 60 * 1_000;
const clientCache = new TTLCache<INPIClient>(CLIENT_TTL_MS);

function getClientFor(authInfo: AuthInfo | undefined): INPIClient {
  const credentials = credentialsFromAuthInfo(authInfo);
  const cacheKey = JSON.stringify(credentials);

  const cached = clientCache.get(cacheKey);
  if (cached) return cached;

  const client = new INPIClient(credentials);
  clientCache.set(cacheKey, client);
  return client;
}

function verifyBearerToken(authHeader: string | null): AuthInfo | undefined {
  const [scheme, bearerToken] = authHeader?.split(" ") ?? [];
  if (scheme?.toLowerCase() !== "bearer" || !bearerToken) return undefined;

  try {
    const payload = readToken<CredentialTokenPayload>("access", bearerToken);
    return {
      token: bearerToken,
      clientId: payload.username,
      scopes: [],
      expiresAt: payload.exp,
      extra: { username: payload.username, password: payload.password },
    };
  } catch {
    return undefined;
  }
}

async function verifyCredentials(req: Request): Promise<AuthInfo | undefined> {
  const username = req.headers.get("X-INPI-Username");
  const password = req.headers.get("X-INPI-Password");

  if (username && password) {
    return { token: username, clientId: username, scopes: [], extra: { username, password } };
  }

  return verifyBearerToken(req.headers.get("Authorization"));
}

const handler = createMcpHandler(
  (server) => {
    registerCapabilities(server, (extra) => getClientFor(extra.authInfo));
  },
  { serverInfo: { name: "mcp-inpi-pi", version: "0.1.0" } },
  { basePath: "/api", maxDuration: 60 }
);

const authedHandler = withMcpAuth(handler, verifyCredentials, { required: true });

export { authedHandler as GET, authedHandler as POST, authedHandler as DELETE };
