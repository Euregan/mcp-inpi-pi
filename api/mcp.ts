/**
 * mcp-inpi-pi — Vercel Function (Streamable HTTP transport).
 *
 * Voir https://vercel.com/docs/mcp/deploy-mcp-servers-to-vercel
 * Déployé à /api/mcp. Serveur multi-utilisateurs : chaque requête doit porter
 * les en-têtes X-INPI-Username / X-INPI-Password (voir README).
 */

import { createMcpHandler, withMcpAuth } from "mcp-handler";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { registerCapabilities } from "../src/server.js";
import { INPIClient } from "../src/api/client.js";
import { credentialsFromAuthInfo } from "../src/api/auth.js";
import { TTLCache } from "../src/utils/cache.js";

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

async function verifyCredentialsHeaders(req: Request): Promise<AuthInfo | undefined> {
  const username = req.headers.get("X-INPI-Username");
  const password = req.headers.get("X-INPI-Password");

  if (!username || !password) return undefined;

  return { token: username, clientId: username, scopes: [], extra: { username, password } };
}

const handler = createMcpHandler(
  (server) => {
    registerCapabilities(server, (extra) => getClientFor(extra.authInfo));
  },
  { serverInfo: { name: "mcp-inpi-pi", version: "0.1.0" } },
  { basePath: "/api", maxDuration: 60 }
);

const authedHandler = withMcpAuth(handler, verifyCredentialsHeaders, { required: true });

export { authedHandler as GET, authedHandler as POST, authedHandler as DELETE };
