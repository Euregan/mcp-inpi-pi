/**
 * Formulaire HTML de connexion INPI, affiché par GET /authorize.
 * Les champs cachés reportent le contexte OAuth de façon stateless (pas de session serveur).
 */

export interface LoginFormParams {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  scope?: string;
  error?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderLoginForm(params: LoginFormParams): string {
  const { clientId, redirectUri, state, codeChallenge, scope, error } = params;

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Connexion INPI — mcp-inpi-pi</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { font-family: system-ui, sans-serif; max-width: 420px; margin: 10vh auto; padding: 0 1.5rem; color: #1a1a1a; }
  h1 { font-size: 1.25rem; }
  label { display: block; margin-top: 1rem; font-weight: 600; }
  input { width: 100%; padding: 0.5rem; margin-top: 0.25rem; box-sizing: border-box; font-size: 1rem; }
  button { margin-top: 1.5rem; width: 100%; padding: 0.6rem; font-size: 1rem; cursor: pointer; }
  .error { color: #b00020; margin-top: 1rem; }
  .hint { color: #555; font-size: 0.85rem; margin-top: 1.5rem; }
</style>
</head>
<body>
  <h1>Connectez votre compte API INPI</h1>
  <p>mcp-inpi-pi utilise vos identifiants <a href="https://data.inpi.fr" target="_blank" rel="noopener">data.inpi.fr</a> pour interroger l'API en votre nom. Ils ne sont jamais partagés avec d'autres utilisateurs.</p>
  ${error ? `<p class="error">${escapeHtml(error)}</p>` : ""}
  <form method="POST" action="/authorize">
    <input type="hidden" name="client_id" value="${escapeHtml(clientId)}">
    <input type="hidden" name="redirect_uri" value="${escapeHtml(redirectUri)}">
    <input type="hidden" name="state" value="${escapeHtml(state)}">
    <input type="hidden" name="code_challenge" value="${escapeHtml(codeChallenge)}">
    ${scope ? `<input type="hidden" name="scope" value="${escapeHtml(scope)}">` : ""}
    <label for="username">Email INPI</label>
    <input type="email" id="username" name="username" required autofocus>
    <label for="password">Mot de passe API INPI</label>
    <input type="password" id="password" name="password" required>
    <button type="submit">Se connecter</button>
  </form>
  <p class="hint">Ce projet est indépendant et n'est ni affilié, ni approuvé, ni sponsorisé par l'INPI.</p>
</body>
</html>`;
}
