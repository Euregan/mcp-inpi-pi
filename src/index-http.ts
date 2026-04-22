#!/usr/bin/env node

/**
 * mcp-inpi-pi — Transport HTTP (Streamable HTTP / SSE expérimental).
 *
 * Lance le serveur MCP sur HTTP au lieu de stdio.
 * Usage : npx mcp-inpi-pi-http
 * Env   : PORT (défaut 3000), INPI_USERNAME, INPI_PASSWORD
 */

import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "./server.js";

const port = Number(process.env.PORT ?? 3000);

const username = process.env.INPI_USERNAME;
const password = process.env.INPI_PASSWORD;

if (!username || !password) {
  console.error(
    "Erreur : les variables d'environnement INPI_USERNAME et INPI_PASSWORD sont requises."
  );
  process.exit(1);
}

/** Une session MCP = un transport + un serveur MCP. */
const sessions = new Map<string, StreamableHTTPServerTransport>();

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "/", `http://localhost:${port}`);

  // Endpoint MCP
  if (url.pathname === "/mcp") {
    // Récupère ou crée une session
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    let transport = sessionId ? sessions.get(sessionId) : undefined;

    if (!transport) {
      // Nouvelle session
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
      });

      const mcpServer = createServer();
      await mcpServer.connect(transport);

      transport.onclose = () => {
        if (transport!.sessionId) sessions.delete(transport!.sessionId);
      };

      if (transport.sessionId) sessions.set(transport.sessionId, transport);
    }

    await transport.handleRequest(req, res);
    return;
  }

  // Health check
  if (url.pathname === "/health" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", transport: "streamable-http" }));
    return;
  }

  res.writeHead(404);
  res.end();
}

const httpServer = createHttpServer((req, res) => {
  handleRequest(req, res).catch((err) => {
    console.error("Erreur de requête :", err);
    if (!res.headersSent) {
      res.writeHead(500);
      res.end();
    }
  });
});

httpServer.listen(port, () => {
  console.error(`mcp-inpi-pi HTTP server listening on http://localhost:${port}/mcp`);
});
