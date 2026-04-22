#!/usr/bin/env node

/**
 * mcp-inpi-pi — Point d'entrée.
 *
 * Lance le serveur MCP avec le transport stdio.
 * Usage : npx mcp-inpi-pi (avec INPI_USERNAME et INPI_PASSWORD en env vars)
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  const username = process.env.INPI_USERNAME;
  const password = process.env.INPI_PASSWORD;

  if (!username || !password) {
    console.error(
      "Erreur : les variables d'environnement INPI_USERNAME et INPI_PASSWORD sont requises.\n" +
        "Créez votre compte sur https://data.inpi.fr puis activez l'accès API PI."
    );
    process.exit(1);
  }

  const server = createServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);
}

main().catch((err) => {
  console.error("Erreur fatale :", err);
  process.exit(1);
});
