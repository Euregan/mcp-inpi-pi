/**
 * Configuration du serveur MCP mcp-inpi-pi.
 *
 * Enregistre les tools et resources auprès du SDK MCP.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { INPIClient } from "./api/client.js";
import { credentialsFromEnv } from "./api/auth.js";
import { handleSearchTool } from "./tools/search.js";
import { handleDetailsTool } from "./tools/details.js";
import { formatNiceClasses } from "./resources/nice-classes.js";

export function createServer(client?: INPIClient): McpServer {
  const server = new McpServer({
    name: "mcp-inpi-pi",
    version: "0.1.0",
  });

  const resolvedClient = client ?? new INPIClient(credentialsFromEnv());

  server.tool(
    "search_trademarks",
    "Recherche de marques dans la base INPI (FR, EU, internationales). Retourne les marques correspondant au terme recherché.",
    {
      query: z.string().describe("Nom ou terme à rechercher"),
      nice_classes: z.array(z.number().int().min(1).max(45)).optional().describe("Filtrer par classe(s) de Nice (1-45)"),
      collections: z.array(z.enum(["FR", "EU", "WO"])).optional().describe("Périmètre : FR (françaises), EU (européennes), WO (internationales). Défaut : toutes."),
      active_only: z.boolean().optional().describe("Ne retourner que les marques en vigueur (défaut : true)"),
      holder: z.string().optional().describe("Filtrer par nom du déposant/titulaire"),
      limit: z.number().int().min(1).max(200).optional().describe("Nombre max de résultats (défaut 20, max 200)"),
    },
    async (params) => handleSearchTool(params, resolvedClient)
  );

  server.tool(
    "get_trademark_details",
    "Fiche complète d'une marque (classes, statut, titulaire, dates, événements).",
    {
      trademark_number: z.string().describe("Numéro de marque (ex: FR4216963, EU018456789, WO1234567)"),
    },
    async (params) => handleDetailsTool(params, resolvedClient)
  );

  // --- Resources ---

  server.resource(
    "nice-classes",
    "nice-classes://list",
    {
      description: "Classification de Nice : liste des 45 classes de produits et services pour le dépôt de marques.",
      mimeType: "text/plain",
    },
    async () => ({
      contents: [
        {
          uri: "nice-classes://list",
          mimeType: "text/plain",
          text: formatNiceClasses(),
        },
      ],
    })
  );

  return server;
}
