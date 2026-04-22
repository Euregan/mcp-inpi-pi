import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchXsrfToken, login, authenticate } from "../../src/api/auth.js";
import { INPIAuthError } from "../../src/api/types.js";

function mockFetch(responses: Array<() => Response | Promise<Response>>) {
  let call = 0;
  return vi.spyOn(globalThis, "fetch").mockImplementation(() => {
    const factory = responses[call++] ?? responses[responses.length - 1];
    return Promise.resolve(factory());
  });
}

/**
 * L'endpoint /authenticate retourne 401 EN PRODUCTION mais pose quand même
 * le cookie XSRF-TOKEN. On ne doit pas lever d'erreur sur ce 401.
 */
function xsrfResponse(token: string | null, status = 401) {
  return new Response(null, {
    status,
    headers: token ? { "set-cookie": `XSRF-TOKEN=${token}; Path=/` } : {},
  });
}

function loginResponse(body: unknown, status = 200, cookies: string[] = []) {
  const headers = new Headers({ "Content-Type": "application/json" });
  for (const cookie of cookies) {
    headers.append("set-cookie", cookie);
  }
  return new Response(JSON.stringify(body), { status, headers });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("auth", () => {
  describe("fetchXsrfToken", () => {
    it("extrait le cookie même si le statut est 401", async () => {
      mockFetch([() => xsrfResponse("abc123", 401)]);

      const token = await fetchXsrfToken();

      expect(token).toBe("abc123");
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/authenticate"),
        expect.objectContaining({ method: "GET" })
      );
    });

    it("extrait le cookie quand le statut est 200", async () => {
      mockFetch([() => xsrfResponse("abc123", 200)]);
      const token = await fetchXsrfToken();
      expect(token).toBe("abc123");
    });

    it("lève INPIAuthError si le cookie XSRF-TOKEN est absent", async () => {
      mockFetch([() => xsrfResponse(null)]);

      await expect(fetchXsrfToken()).rejects.toThrow(INPIAuthError);
      await expect(fetchXsrfToken()).rejects.toThrow("XSRF-TOKEN");
    });
  });

  describe("login", () => {
    it("retourne accessToken et loginCookies", async () => {
      mockFetch([() => loginResponse(
        { access_token: "jwt.token.here" },
        200,
        ["access_token=jwt.token.here; Domain=.inpi.fr; Path=/; HttpOnly",
         "refresh_token=refresh.here; Domain=.inpi.fr; Path=/; HttpOnly"]
      )]);

      const result = await login({ username: "user", password: "pass" }, "xsrf123");

      expect(result.accessToken).toBe("jwt.token.here");
      expect(Array.isArray(result.loginCookies)).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/login"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "X-XSRF-TOKEN": "xsrf123",
            "Cookie": "XSRF-TOKEN=xsrf123",
          }),
        })
      );
    });

    it("lève INPIAuthError sur identifiants invalides (401)", async () => {
      mockFetch([() => loginResponse({ error: "Unauthorized" }, 401)]);

      await expect(
        login({ username: "bad", password: "bad" }, "xsrf")
      ).rejects.toThrow(INPIAuthError);

      await expect(
        login({ username: "bad", password: "bad" }, "xsrf")
      ).rejects.toThrow("401");
    });
  });

  describe("authenticate", () => {
    it("retourne xsrfToken, accessToken et sessionCookie", async () => {
      mockFetch([
        () => xsrfResponse("xsrf-abc"),
        () => loginResponse(
          { access_token: "jwt-xyz" },
          200,
          ["access_token=jwt-xyz; Domain=.inpi.fr; Path=/; HttpOnly"]
        ),
      ]);

      const session = await authenticate({ username: "u", password: "p" });

      expect(session.xsrfToken).toBe("xsrf-abc");
      expect(session.accessToken).toBe("jwt-xyz");
      expect(session.sessionCookie).toContain("XSRF-TOKEN=xsrf-abc");
      expect(session.sessionCookie).toContain("access_token=jwt-xyz");
    });
  });
});
