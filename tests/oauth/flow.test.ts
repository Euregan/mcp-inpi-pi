import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import pkceChallenge from "pkce-challenge";
import { registerClient } from "../../src/oauth/register.js";
import { parseAuthorizeRequest, issueAuthorizationCode } from "../../src/oauth/authorize.js";
import { exchangeAuthorizationCode, exchangeRefreshToken } from "../../src/oauth/token.js";
import { readToken } from "../../src/oauth/token-crypto.js";
import { INPIAuthError } from "../../src/api/types.js";

vi.mock("../../src/api/auth.js", () => ({
  authenticate: vi.fn(),
}));

const ORIGINAL_SECRET = process.env.OAUTH_TOKEN_SECRET;

beforeEach(() => {
  process.env.OAUTH_TOKEN_SECRET = "test-secret-do-not-use-in-prod";
});

afterEach(() => {
  process.env.OAUTH_TOKEN_SECRET = ORIGINAL_SECRET;
  vi.restoreAllMocks();
});

describe("flux OAuth complet", () => {
  it("register → authorize → token → refresh, bout en bout", async () => {
    const { authenticate } = await import("../../src/api/auth.js");
    vi.mocked(authenticate).mockResolvedValue({
      xsrfToken: "x",
      accessToken: "y",
      sessionCookie: "z",
    });

    const registration = registerClient({ redirect_uris: ["https://claude.ai/api/mcp/callback"] });
    expect(registration.token_endpoint_auth_method).toBe("none");

    const { code_verifier, code_challenge } = await pkceChallenge();

    const authorizeRequest = parseAuthorizeRequest(
      new URLSearchParams({
        response_type: "code",
        client_id: registration.client_id,
        redirect_uri: "https://claude.ai/api/mcp/callback",
        state: "abc",
        code_challenge,
        code_challenge_method: "S256",
      })
    );

    const code = await issueAuthorizationCode(authorizeRequest, {
      username: "user@example.com",
      password: "hunter2",
    });
    expect(authenticate).toHaveBeenCalledWith({ username: "user@example.com", password: "hunter2" });

    const tokens = await exchangeAuthorizationCode({
      code,
      redirectUri: "https://claude.ai/api/mcp/callback",
      codeVerifier: code_verifier,
    });
    expect(tokens.token_type).toBe("Bearer");

    const accessPayload = readToken<{ username: string; password: string }>("access", tokens.access_token);
    expect(accessPayload.username).toBe("user@example.com");
    expect(accessPayload.password).toBe("hunter2");

    const refreshed = exchangeRefreshToken(tokens.refresh_token);
    const refreshedPayload = readToken<{ username: string }>("access", refreshed.access_token);
    expect(refreshedPayload.username).toBe("user@example.com");
  });

  it("rejette un redirect_uri non enregistré", () => {
    const registration = registerClient({ redirect_uris: ["https://claude.ai/api/mcp/callback"] });

    expect(() =>
      parseAuthorizeRequest(
        new URLSearchParams({
          response_type: "code",
          client_id: registration.client_id,
          redirect_uri: "https://evil.example/steal",
          state: "abc",
          code_challenge: "challenge",
          code_challenge_method: "S256",
        })
      )
    ).toThrow(INPIAuthError);
  });

  it("rejette un code_verifier PKCE incorrect", async () => {
    const { authenticate } = await import("../../src/api/auth.js");
    vi.mocked(authenticate).mockResolvedValue({
      xsrfToken: "x",
      accessToken: "y",
      sessionCookie: "z",
    });

    const registration = registerClient({ redirect_uris: ["https://claude.ai/api/mcp/callback"] });
    const { code_challenge } = await pkceChallenge();

    const authorizeRequest = parseAuthorizeRequest(
      new URLSearchParams({
        response_type: "code",
        client_id: registration.client_id,
        redirect_uri: "https://claude.ai/api/mcp/callback",
        state: "abc",
        code_challenge,
        code_challenge_method: "S256",
      })
    );

    const code = await issueAuthorizationCode(authorizeRequest, { username: "u", password: "p" });

    await expect(
      exchangeAuthorizationCode({
        code,
        redirectUri: "https://claude.ai/api/mcp/callback",
        codeVerifier: "wrong-verifier-wrong-verifier-wrong-verifier",
      })
    ).rejects.toThrow(INPIAuthError);
  });

  it("rejette des identifiants INPI invalides à l'étape /authorize", async () => {
    const { authenticate } = await import("../../src/api/auth.js");
    vi.mocked(authenticate).mockRejectedValue(new INPIAuthError("Identifiants INPI invalides (401)"));

    const registration = registerClient({ redirect_uris: ["https://claude.ai/api/mcp/callback"] });
    const { code_challenge } = await pkceChallenge();

    const authorizeRequest = parseAuthorizeRequest(
      new URLSearchParams({
        response_type: "code",
        client_id: registration.client_id,
        redirect_uri: "https://claude.ai/api/mcp/callback",
        state: "abc",
        code_challenge,
        code_challenge_method: "S256",
      })
    );

    await expect(
      issueAuthorizationCode(authorizeRequest, { username: "bad", password: "bad" })
    ).rejects.toThrow(INPIAuthError);
  });
});
