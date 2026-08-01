/**
 * mcp-inpi-pi — Vercel Function (Streamable HTTP transport).
 *
 * Voir https://vercel.com/docs/mcp/deploy-mcp-servers-to-vercel
 * Déployé à /api/mcp. Env : INPI_USERNAME, INPI_PASSWORD requis.
 */

import { createMcpHandler } from "mcp-handler";
import { registerCapabilities } from "../src/server.js";
import { INPIClient } from "../src/api/client.js";
import { credentialsFromEnv } from "../src/api/auth.js";

const handler = createMcpHandler(
  (server) => {
    registerCapabilities(server, new INPIClient(credentialsFromEnv()));
  },
  { serverInfo: { name: "mcp-inpi-pi", version: "0.1.0" } },
  { basePath: "/api", maxDuration: 60 }
);

export { handler as GET, handler as POST, handler as DELETE };
