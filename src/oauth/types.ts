/**
 * Types des payloads portés par les tokens OAuth (chiffrés, voir token-crypto.ts).
 */

export interface ClientTokenPayload {
  redirectUris: string[];
}

export interface AuthorizationCodePayload {
  username: string;
  password: string;
  codeChallenge: string;
  redirectUri: string;
}

export interface CredentialTokenPayload {
  username: string;
  password: string;
}
