/**
 * mcp-inpi-pi — Métadonnées de ressource protégée (RFC 9728).
 * Monté sur /.well-known/oauth-protected-resource via vercel.json (rewrites).
 */

import { protectedResourceHandler, metadataCorsOptionsRequestHandler, getPublicOrigin } from "mcp-handler";

export function GET(req: Request): Response {
  const origin = getPublicOrigin(req);
  return protectedResourceHandler({
    authServerUrls: [origin],
    resourceUrl: `${origin}/api/mcp`,
  })(req);
}

export const OPTIONS = metadataCorsOptionsRequestHandler();
