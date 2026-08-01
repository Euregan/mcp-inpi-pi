/**
 * mcp-inpi-pi — OAuth Authorization endpoint (RFC 6749 §4.1 + PKCE).
 * Monté sur /authorize via vercel.json (rewrites).
 */

import { parseAuthorizeRequest, issueAuthorizationCode } from "../src/oauth/authorize.js";
import { renderLoginForm } from "../src/oauth/login-form.js";
import { INPIAuthError } from "../src/api/types.js";

function htmlResponse(html: string, status = 200): Response {
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function errorPage(err: unknown): Response {
  const message = err instanceof INPIAuthError ? err.message : "Requête invalide";
  return htmlResponse(`<p>Erreur : ${message}</p>`, 400);
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  try {
    const request = parseAuthorizeRequest(url.searchParams);
    return htmlResponse(renderLoginForm(request));
  } catch (err) {
    return errorPage(err);
  }
}

export async function POST(req: Request): Promise<Response> {
  const form = new URLSearchParams(await req.text());
  const username = form.get("username") ?? "";
  const password = form.get("password") ?? "";

  let request;
  try {
    // Revalide client_id/redirect_uri : le formulaire soumis pourrait avoir été altéré.
    request = parseAuthorizeRequest(
      new URLSearchParams({
        response_type: "code",
        client_id: form.get("client_id") ?? "",
        redirect_uri: form.get("redirect_uri") ?? "",
        state: form.get("state") ?? "",
        code_challenge: form.get("code_challenge") ?? "",
        code_challenge_method: "S256",
        ...(form.get("scope") ? { scope: form.get("scope") as string } : {}),
      })
    );
  } catch (err) {
    return errorPage(err);
  }

  if (!username || !password) {
    return htmlResponse(renderLoginForm({ ...request, error: "Email et mot de passe requis." }));
  }

  try {
    const code = await issueAuthorizationCode(request, { username, password });
    const redirectUrl = new URL(request.redirectUri);
    redirectUrl.searchParams.set("code", code);
    redirectUrl.searchParams.set("state", request.state);
    return new Response(null, { status: 302, headers: { Location: redirectUrl.toString() } });
  } catch (err) {
    const message = err instanceof INPIAuthError ? err.message : "Erreur d'authentification INPI.";
    return htmlResponse(renderLoginForm({ ...request, error: message }));
  }
}
