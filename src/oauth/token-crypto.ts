/**
 * Tokens OAuth chiffrés, sans état (pas de base de données côté serveur).
 *
 * Chaque code/token EST la donnée qu'il représente (identifiants INPI inclus),
 * chiffrée avec AES-256-GCM sous une clé dérivée de OAUTH_TOKEN_SECRET.
 * Le "kind" sert d'AAD : un code d'autorisation ne peut pas être rejoué comme
 * access token, etc. (séparation par domaine d'usage).
 *
 * Limite acceptée : sans stockage côté serveur, il n'y a pas de révocation
 * individuelle — seule la rotation de OAUTH_TOKEN_SECRET invalide tous les
 * tokens en circulation, pour tous les utilisateurs.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { INPIAuthError } from "../api/types.js";

export type TokenKind = "client" | "code" | "access" | "refresh";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function deriveKey(): Buffer {
  const secret = process.env.OAUTH_TOKEN_SECRET;
  if (!secret) {
    throw new INPIAuthError(
      "Variable d'environnement OAUTH_TOKEN_SECRET requise pour l'authentification OAuth"
    );
  }
  return createHash("sha256").update(secret).digest();
}

export function issueToken(
  kind: TokenKind,
  payload: Record<string, unknown>,
  ttlSeconds: number
): string {
  const key = deriveKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  cipher.setAAD(Buffer.from(kind));

  const body = JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds });
  const ciphertext = Buffer.concat([cipher.update(body, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, ciphertext]).toString("base64url");
}

export function readToken<T>(kind: TokenKind, token: string): T & { exp: number } {
  const key = deriveKey();
  const raw = Buffer.from(token, "base64url");

  if (raw.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new INPIAuthError("Token malformé");
  }

  const iv = raw.subarray(0, IV_LENGTH);
  const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAAD(Buffer.from(kind));
  decipher.setAuthTag(authTag);

  let plaintext: Buffer;
  try {
    plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    throw new INPIAuthError("Token invalide, falsifié ou de mauvais type");
  }

  const payload = JSON.parse(plaintext.toString("utf8")) as T & { exp: number };

  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new INPIAuthError("Token expiré");
  }

  return payload;
}
