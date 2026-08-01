import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { issueToken, readToken } from "../../src/oauth/token-crypto.js";
import { INPIAuthError } from "../../src/api/types.js";

const ORIGINAL_SECRET = process.env.OAUTH_TOKEN_SECRET;

beforeEach(() => {
  process.env.OAUTH_TOKEN_SECRET = "test-secret-do-not-use-in-prod";
});

afterEach(() => {
  process.env.OAUTH_TOKEN_SECRET = ORIGINAL_SECRET;
});

describe("token-crypto", () => {
  it("round-trip un payload avec le même kind", () => {
    const token = issueToken("access", { username: "u", password: "p" }, 3600);
    const payload = readToken<{ username: string; password: string }>("access", token);

    expect(payload.username).toBe("u");
    expect(payload.password).toBe("p");
  });

  it("lève INPIAuthError si le token est expiré", () => {
    const token = issueToken("access", { username: "u" }, -10);
    expect(() => readToken("access", token)).toThrow(INPIAuthError);
    expect(() => readToken("access", token)).toThrow("expiré");
  });

  it("lève INPIAuthError si le kind ne correspond pas (pas de rejeu cross-endpoint)", () => {
    const code = issueToken("code", { username: "u" }, 300);
    expect(() => readToken("access", code)).toThrow(INPIAuthError);
  });

  it("lève INPIAuthError si le token est falsifié", () => {
    const token = issueToken("access", { username: "u" }, 3600);
    const tampered = token.slice(0, -4) + (token.slice(-4) === "AAAA" ? "BBBB" : "AAAA");
    expect(() => readToken("access", tampered)).toThrow(INPIAuthError);
  });

  it("lève INPIAuthError si OAUTH_TOKEN_SECRET est absent", () => {
    delete process.env.OAUTH_TOKEN_SECRET;
    expect(() => issueToken("access", { username: "u" }, 3600)).toThrow(INPIAuthError);
  });

  it("des secrets différents produisent des tokens non compatibles", () => {
    const token = issueToken("access", { username: "u" }, 3600);
    process.env.OAUTH_TOKEN_SECRET = "another-secret";
    expect(() => readToken("access", token)).toThrow(INPIAuthError);
  });
});
