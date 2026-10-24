import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const GOOGLE_BUSINESS_SCOPE = "https://www.googleapis.com/auth/business.manage";
export const GOOGLE_BUSINESS_CALLBACK_PATH = "/api/admin/google-business/callback";

/** State and verifier are stored encrypted, bound to the admin session, for ten minutes. */
export function createGoogleOAuthRequest(clientId: string, redirectUri: string) {
  if (!clientId.endsWith(".apps.googleusercontent.com")) throw new Error("Google OAuth web client ID is required.");
  const redirect = new URL(redirectUri);
  const local = redirect.hostname === "localhost" || redirect.hostname === "127.0.0.1";
  if ((redirect.protocol !== "https:" && !(redirect.protocol === "http:" && local)) || redirect.username || redirect.password || redirect.search || redirect.hash || redirect.pathname !== GOOGLE_BUSINESS_CALLBACK_PATH) {
    throw new Error("Use the configured HTTPS Google Business callback URL (HTTP is allowed only on localhost).");
  }
  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({ client_id: clientId, redirect_uri: redirect.href, response_type: "code", scope: `openid email ${GOOGLE_BUSINESS_SCOPE}`, access_type: "offline", prompt: "consent select_account", state, code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256" }).toString();
  return { url: url.href, state, verifier };
}

export function matchesGoogleOAuthState(expected: string, received: string): boolean {
  if (!/^[A-Za-z0-9_-]{43}$/.test(expected) || !/^[A-Za-z0-9_-]{43}$/.test(received)) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}
