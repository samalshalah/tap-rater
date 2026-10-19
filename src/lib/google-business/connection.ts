import { createHash, randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { z } from "zod";
import { encryptGoogleSecret, decryptGoogleSecret } from "./token-vault";
import { createGoogleOAuthRequest, GOOGLE_BUSINESS_SCOPE } from "./oauth";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
export function googleConnectionConfigured() {
  return Boolean(process.env.GOOGLE_BUSINESS_CLIENT_ID && process.env.GOOGLE_BUSINESS_CLIENT_SECRET && process.env.GOOGLE_BUSINESS_REDIRECT_URI && /^[a-f0-9]{64}$/i.test(process.env.GOOGLE_BUSINESS_TOKEN_KEY || "") && (process.env.DATABASE_URL || process.env.NEON_DATABASE_URL));
}
export function googleConfig() {
  if (!googleConnectionConfigured()) throw new Error("Google connection configuration is incomplete.");
  return { clientId: process.env.GOOGLE_BUSINESS_CLIENT_ID!, clientSecret: process.env.GOOGLE_BUSINESS_CLIENT_SECRET!, redirectUri: process.env.GOOGLE_BUSINESS_REDIRECT_URI! };
}
function database() {
  const url = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  if (!url) throw new Error("Google connection storage is unavailable.");
  return neon(url);
}
export async function beginGoogleConnection(owner: string, session: string) {
  const config = googleConfig();
  const flow = createGoogleOAuthRequest(config.clientId, config.redirectUri);
  const stateHash = hash(flow.state);
  const sql = database();
  // Bound storage growth and prevent an old pending flow from replacing a later connection.
  await sql`DELETE FROM google_business_oauth_attempts WHERE expires_at < now() OR owner = ${owner}`;
  await sql`INSERT INTO google_business_oauth_attempts (state_hash, owner, session_hash, verifier_ciphertext, expires_at)
    VALUES (${stateHash}, ${owner}, ${hash(session)}, ${encryptGoogleSecret(flow.verifier, `oauth:${stateHash}`)}, now() + interval '10 minutes')`;
  return flow.url;
}

const tokensSchema = z.object({ access_token: z.string().min(1), expires_in: z.number().positive().max(86400), refresh_token: z.string().min(1).optional(), scope: z.string().optional(), token_type: z.string().refine(value => value.toLowerCase() === "bearer") });
export class GoogleTokenExchangeError extends Error {
  constructor(public readonly reason: string) { super("Google token exchange failed."); }
}
async function tokenRequest(body: URLSearchParams) {
  let response: Response;
  try {
    response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(15_000), headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body.toString() });
  } catch (error) {
    throw new GoogleTokenExchangeError(error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError") ? "network_timeout" : "network_error");
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const allowed = ["invalid_grant", "invalid_client", "unauthorized_client", "access_denied", "invalid_scope", "invalid_request", "temporarily_unavailable"];
    throw new GoogleTokenExchangeError(allowed.includes(error.error) ? error.error : "provider_error");
  }
  const parsed = tokensSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new GoogleTokenExchangeError("invalid_token_response");
  return parsed.data;
}
export type GoogleConnectionStage = "validate" | "state" | "decrypt" | "exchange" | "permission" | "identity" | "offline" | "storage";
export async function completeGoogleConnection(owner: string, session: string, state: string, code: string, progress: (stage: GoogleConnectionStage) => void = () => {}) {
  progress("validate");
  if (!/^[A-Za-z0-9_-]{43}$/.test(state) || !code || code.length > 4096) throw new Error("Invalid OAuth response.");
  const config = googleConfig();
  const sql = database();
  const stateHash = hash(state);
  progress("state");
  // DELETE RETURNING makes state consumption atomic and single use across workers.
  const attempts = await sql`DELETE FROM google_business_oauth_attempts WHERE state_hash = ${stateHash}
    AND owner = ${owner} AND session_hash = ${hash(session)} AND expires_at > now() RETURNING verifier_ciphertext`;
  if (attempts.length !== 1) throw new Error("OAuth request expired or does not match this admin session.");
  progress("decrypt");
  const verifier = decryptGoogleSecret(String(attempts[0].verifier_ciphertext), `oauth:${stateHash}`);
  progress("exchange");
  const token = await tokenRequest(new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: config.redirectUri, code, code_verifier: verifier, grant_type: "authorization_code" }));
  progress("permission");
  if (!token.scope?.split(" ").includes(GOOGLE_BUSINESS_SCOPE)) throw new Error("Google Business Profile permission was not granted.");
  progress("identity");
  const identityResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${token.access_token}` }, redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(15_000) });
  if (!identityResponse.ok) throw new Error("Google account identity could not be verified.");
  const identity = z.object({ sub: z.string().min(1), email: z.string().email(), email_verified: z.literal(true) }).parse(await identityResponse.json());
  // Preserve a missing refresh token only for the same Google identity.
  progress("offline");
  const previous = await sql`SELECT refresh_ciphertext, google_subject FROM google_business_connections WHERE owner = ${owner}`;
  const refresh = token.refresh_token ? encryptGoogleSecret(token.refresh_token, `refresh:${owner}:${identity.sub}`) : previous[0]?.google_subject === identity.sub ? previous[0].refresh_ciphertext : null;
  if (!refresh) throw new Error("Google did not grant offline access. Reconnect and grant consent.");
  progress("storage");
  await sql`INSERT INTO google_business_connections (owner, google_subject, email, access_ciphertext, refresh_ciphertext, expires_at, scopes)
    VALUES (${owner}, ${identity.sub}, ${identity.email}, ${encryptGoogleSecret(token.access_token, `access:${owner}:${identity.sub}`)}, ${refresh}, ${new Date(Date.now() + token.expires_in * 1000).toISOString()}, ${token.scope})
    ON CONFLICT (owner) DO UPDATE SET google_subject = EXCLUDED.google_subject, email = EXCLUDED.email,
      access_ciphertext = EXCLUDED.access_ciphertext, refresh_ciphertext = EXCLUDED.refresh_ciphertext,
      expires_at = EXCLUDED.expires_at, scopes = EXCLUDED.scopes, updated_at = now(), version = google_business_connections.version + 1, refresh_lock = NULL, refresh_lock_until = NULL`;
}

export async function googleConnectionSummary(owner: string) {
  const rows = await database()`SELECT email, updated_at FROM google_business_connections WHERE owner = ${owner}`;
  return rows[0] ? { email: String(rows[0].email), updatedAt: String(rows[0].updated_at) } : null;
}

/** Server only; never return this value in an HTTP response. */
export async function googleAccessToken(owner: string) {
  const sql = database();
  const rows = await sql`SELECT * FROM google_business_connections WHERE owner = ${owner}`;
  const row = rows[0];
  if (!row) throw new Error("Connect Google first.");
  const context = `${owner}:${row.google_subject}`;
  if (new Date(String(row.expires_at)).getTime() > Date.now() + 60_000) return decryptGoogleSecret(String(row.access_ciphertext), `access:${context}`);
  const lock = randomUUID();
  const acquired = await sql`UPDATE google_business_connections SET refresh_lock = ${lock}, refresh_lock_until = now() + interval '60 seconds'
    WHERE owner = ${owner} AND version = ${row.version} AND (refresh_lock_until IS NULL OR refresh_lock_until < now()) RETURNING owner`;
  if (!acquired.length) throw new Error("Google connection is being refreshed. Try again shortly.");
  try {
    const config = googleConfig();
    const token = await tokenRequest(new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, grant_type: "refresh_token", refresh_token: decryptGoogleSecret(String(row.refresh_ciphertext), `refresh:${context}`) }));
    if (token.scope && !token.scope.split(" ").includes(GOOGLE_BUSINESS_SCOPE)) throw new Error("Google Business Profile permission was revoked.");
    const refreshed = await sql`UPDATE google_business_connections SET access_ciphertext = ${encryptGoogleSecret(token.access_token, `access:${context}`)},
      refresh_ciphertext = ${token.refresh_token ? encryptGoogleSecret(token.refresh_token, `refresh:${context}`) : row.refresh_ciphertext},
      expires_at = ${new Date(Date.now() + token.expires_in * 1000).toISOString()}, updated_at = now(), version = version + 1,
      refresh_lock = NULL, refresh_lock_until = NULL WHERE owner = ${owner} AND version = ${row.version} AND refresh_lock = ${lock} RETURNING owner`;
    if (!refreshed.length) throw new Error("Google connection changed. Try again.");
    return token.access_token;
  } finally {
    await sql`UPDATE google_business_connections SET refresh_lock = NULL, refresh_lock_until = NULL WHERE owner = ${owner} AND refresh_lock = ${lock}`;
  }
}

export async function disconnectGoogle(owner: string) {
  const sql = database();
  const rows = await sql`SELECT google_subject, refresh_ciphertext, version FROM google_business_connections WHERE owner = ${owner}`;
  if (rows[0]) {
    const token = decryptGoogleSecret(String(rows[0].refresh_ciphertext), `refresh:${owner}:${rows[0].google_subject}`);
    const response = await fetch("https://oauth2.googleapis.com/revoke", { method: "POST", redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(15_000), headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ token }) });
    // Already-invalid tokens are effectively disconnected. Preserve local storage on temporary Google failures.
    if (!response.ok && response.status !== 400) throw new Error("Google revocation failed. Try disconnecting again.");
    await sql`DELETE FROM google_business_connections WHERE owner = ${owner} AND version = ${rows[0].version}`;
  }
  await sql`DELETE FROM google_business_oauth_attempts WHERE owner = ${owner}`;
}
