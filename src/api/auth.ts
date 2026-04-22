/**
 * Auth INPI : hybride XSRF + Bearer JWT.
 * Porté de inpi_client.py (validé en prod).
 *
 * Flow :
 * 1. GET /services/uaa/api/authenticate → cookie XSRF-TOKEN
 * 2. POST /auth/login avec XSRF → JSON { access_token }
 * 3. Requêtes avec Authorization: Bearer + X-XSRF-TOKEN
 */

import type { INPICredentials, INPISession } from "./types.js";
import { INPIAuthError } from "./types.js";

const XSRF_URL =
  "https://api-gateway.inpi.fr/services/uaa/api/authenticate";
const AUTH_URL = "https://api-gateway.inpi.fr/auth/login";
const TIMEOUT_MS = 15_000;

function withTimeout(ms: number): AbortSignal {
  return AbortSignal.timeout(ms);
}

/**
 * Extrait la valeur du cookie XSRF-TOKEN depuis l'en-tête set-cookie.
 * Gère les cas multi-cookies (valeurs séparées par virgule ou plusieurs headers).
 */
function extractXsrfCookie(setCookie: string | null): string | null {
  if (!setCookie) return null;
  // set-cookie peut contenir plusieurs cookies séparés par ", " mais
  // les dates (Thu, 01 Jan) rendent ce parsing ambigu — on cherche par nom.
  const match = setCookie.match(/(?:^|,\s*)XSRF-TOKEN=([^;,]+)/i);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Étape 1 : récupère le XSRF token depuis le cookie de l'endpoint d'auth.
 */
export async function fetchXsrfToken(): Promise<string> {
  let response: Response;
  try {
    response = await fetch(XSRF_URL, {
      method: "GET",
      signal: withTimeout(TIMEOUT_MS),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new INPIAuthError(`Impossible de contacter l'endpoint XSRF : ${msg}`);
  }

  // L'API INPI retourne 401 sur cet endpoint mais inclut quand même
  // le cookie XSRF-TOKEN — on ignore le statut et on cherche le cookie.
  const setCookie = response.headers.get("set-cookie");
  const xsrf = extractXsrfCookie(setCookie);

  if (!xsrf) {
    throw new INPIAuthError(
      "Cookie XSRF-TOKEN absent de la réponse de l'endpoint d'authentification"
    );
  }

  return xsrf;
}

/**
 * Étape 2 : login avec le XSRF token, retourne l'access_token JWT et les cookies de session.
 */
export async function login(
  credentials: INPICredentials,
  xsrfToken: string
): Promise<{ accessToken: string; loginCookies: string[] }> {
  let response: Response;
  try {
    response = await fetch(AUTH_URL, {
      method: "POST",
      signal: withTimeout(TIMEOUT_MS),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/plain, */*",
        "X-XSRF-TOKEN": xsrfToken,
        Cookie: `XSRF-TOKEN=${xsrfToken}`,
      },
      body: JSON.stringify({
        username: credentials.username,
        password: credentials.password,
        rememberMe: true,
      }),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new INPIAuthError(`Impossible de contacter l'endpoint de login : ${msg}`);
  }

  if (response.status === 401) {
    throw new INPIAuthError("Identifiants INPI invalides (401)");
  }

  if (!response.ok) {
    throw new INPIAuthError(`Échec du login INPI (HTTP ${response.status})`);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new INPIAuthError("Réponse de login invalide (JSON attendu)");
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("access_token" in body) ||
    typeof (body as Record<string, unknown>).access_token !== "string"
  ) {
    throw new INPIAuthError(
      "Réponse de login invalide : champ access_token manquant ou mal typé"
    );
  }

  const accessToken = (body as { access_token: string }).access_token;

  // Capture les cookies de session posés par le login (access_token, refresh_token)
  const loginCookies: string[] =
    // @ts-expect-error — getSetCookie() dispo Node 18.14+ / undici
    typeof response.headers.getSetCookie === "function"
      ? (response.headers as unknown as { getSetCookie(): string[] }).getSetCookie()
      : [];

  return { accessToken, loginCookies };
}

/**
 * Authentification complète → INPISession.
 * Point d'entrée principal pour les consommateurs du module.
 */
export async function authenticate(
  credentials: INPICredentials
): Promise<INPISession> {
  const xsrfToken = await fetchXsrfToken();
  const { accessToken, loginCookies } = await login(credentials, xsrfToken);

  // Construit le header Cookie à renvoyer sur toutes les requêtes API :
  // XSRF-TOKEN (validation CSRF) + access_token/refresh_token (session login)
  const loginCookieValues = loginCookies
    .map((c) => c.match(/^([^=]+=[^;]+)/)?.[0])
    .filter(Boolean)
    .join("; ");
  const sessionCookie = `XSRF-TOKEN=${xsrfToken}; ${loginCookieValues}`;

  return { xsrfToken, accessToken, sessionCookie };
}

/**
 * Credentials depuis les variables d'environnement.
 * Lève une INPIAuthError si INPI_USERNAME ou INPI_PASSWORD est absent.
 */
export function credentialsFromEnv(): INPICredentials {
  const username = process.env.INPI_USERNAME;
  const password = process.env.INPI_PASSWORD;

  if (!username || !password) {
    throw new INPIAuthError(
      "Variables d'environnement INPI_USERNAME et INPI_PASSWORD requises"
    );
  }

  return { username, password };
}
