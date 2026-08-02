/**
 * mcp-inpi-pi — Métadonnées de ressource protégée (RFC 9728).
 * Monté sur /.well-known/oauth-protected-resource via vercel.json (rewrites).
 */

import { protectedResourceHandler, metadataCorsOptionsRequestHandler, getPublicOrigin } from "mcp-handler";
import { methodRouter } from "../src/utils/http.js";

function GET(req: Request): Response {
  const origin = getPublicOrigin(req);
  return protectedResourceHandler({
    authServerUrls: [origin],
    resourceUrl: `${origin}/api/mcp`,
  })(req);
}

const OPTIONS = metadataCorsOptionsRequestHandler();

export default methodRouter({ GET, OPTIONS });
