import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { encryptGoogleSecret, decryptGoogleSecret } from "../../src/lib/google-business/token-vault";
const { sql } = vi.hoisted(() => ({ sql: vi.fn() }));
vi.mock("@neondatabase/serverless", () => ({ neon: () => sql }));
import { beginGoogleConnection, completeGoogleConnection, googleAccessToken, disconnectGoogle } from "../../src/lib/google-business/connection";
const key = "ab".repeat(32);
const owner = "admin@example.com";

beforeEach(() => {
  vi.stubEnv("GOOGLE_BUSINESS_TOKEN_KEY", key);
  vi.stubEnv("GOOGLE_BUSINESS_CLIENT_ID", "123.apps.googleusercontent.com");
  vi.stubEnv("GOOGLE_BUSINESS_CLIENT_SECRET", "test-secret");
  vi.stubEnv("GOOGLE_BUSINESS_REDIRECT_URI", "https://taprater.com/api/admin/google-business/callback");
  vi.stubEnv("DATABASE_URL", "postgres://test");
  sql.mockReset();
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("encrypted Google token storage", () => {
  it("uses randomized authenticated encryption bound to owner and token type", () => {
    const ciphertext = encryptGoogleSecret("secret-token", "refresh:one", key);
    expect(ciphertext).not.toContain("secret-token");
    expect(encryptGoogleSecret("secret-token", "refresh:one", key)).not.toBe(ciphertext);
    expect(decryptGoogleSecret(ciphertext, "refresh:one", key)).toBe("secret-token");
    expect(() => decryptGoogleSecret(ciphertext, "refresh:two", key)).toThrow();
    expect(() => decryptGoogleSecret(ciphertext, "refresh:one", "cd".repeat(32))).toThrow();
    const parts = ciphertext.split(".");
    parts[3] = (parts[3][0] === "A" ? "B" : "A") + parts[3].slice(1);
    expect(() => decryptGoogleSecret(parts.join("."), "refresh:one", key)).toThrow();
  });
  it("fails closed with an absent or malformed encryption key", () => {
    expect(() => encryptGoogleSecret("secret", "ctx", "short")).toThrow();
    expect(() => decryptGoogleSecret("bad", "ctx", key)).toThrow();
  });
  it("stores only hashed state and encrypted PKCE verifier", async () => {
    sql.mockResolvedValue([]);
    const url = new URL(await beginGoogleConnection(owner, "admin-session"));
    const insert = sql.mock.calls[1];
    expect(insert).not.toContain("admin-session");
    expect(insert).not.toContain(url.searchParams.get("state"));
    expect(insert[1]).toBe(createHash("sha256").update(url.searchParams.get("state")!).digest("hex"));
    expect(String(insert[4])).toMatch(/^v1\./);
  });
  it("does not exchange a code when state is missing, expired, replayed or bound to another session", async () => {
    sql.mockResolvedValue([]);
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    await expect(completeGoogleConnection(owner, "session", "a".repeat(43), "code")).rejects.toThrow("expired");
    const query = sql.mock.calls[0][0].join("?");
    expect(query).toContain("DELETE FROM");
    expect(query).toContain("session_hash");
    expect(query).toContain("expires_at > now()");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("requires the requested Business Profile scope before saving", async () => {
    const state = "a".repeat(43); const stateHash = createHash("sha256").update(state).digest("hex");
    sql.mockResolvedValueOnce([{ verifier_ciphertext: encryptGoogleSecret("verifier", `oauth:${stateHash}`) }]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ access_token: "access", refresh_token: "refresh", expires_in: 3600, token_type: "Bearer", scope: "openid email" })));
    await expect(completeGoogleConnection(owner, "session", state, "code")).rejects.toThrow("permission");
    expect(sql).toHaveBeenCalledTimes(1);
  });
  it("returns unexpired tokens without contacting Google", async () => {
    sql.mockResolvedValueOnce([{ google_subject: "sub", access_ciphertext: encryptGoogleSecret("access", `access:${owner}:sub`), expires_at: new Date(Date.now() + 3600000).toISOString() }]);
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    expect(await googleAccessToken(owner)).toBe("access");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("exchanges a valid callback and saves only encrypted credentials", async () => {
    const state = "a".repeat(43); const stateHash = createHash("sha256").update(state).digest("hex");
    sql.mockResolvedValueOnce([{ verifier_ciphertext: encryptGoogleSecret("verifier", `oauth:${stateHash}`) }]).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ access_token: "raw-access", refresh_token: "raw-refresh", expires_in: 3600, token_type: "Bearer", scope: "openid email https://www.googleapis.com/auth/business.manage" })).mockResolvedValueOnce(Response.json({ sub: "subject", email: "pilot@example.com", email_verified: true }));
    vi.stubGlobal("fetch", fetcher);
    await completeGoogleConnection(owner, "session", state, "auth-code");
    const saved = sql.mock.calls[2];
    expect(JSON.stringify(saved)).not.toContain("raw-access");
    expect(JSON.stringify(saved)).not.toContain("raw-refresh");
    expect(decryptGoogleSecret(saved[4], `access:${owner}:subject`)).toBe("raw-access");
    expect(decryptGoogleSecret(saved[5], `refresh:${owner}:subject`)).toBe("raw-refresh");
    expect(fetcher.mock.calls[0][1].body.get("code_verifier")).toBe("verifier");
  });
  it("does not run concurrent token refreshes", async () => {
    sql.mockResolvedValueOnce([{ google_subject: "sub", expires_at: new Date(0).toISOString(), version: 1 }]).mockResolvedValueOnce([]);
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    await expect(googleAccessToken(owner)).rejects.toThrow("being refreshed");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("preserves a refresh token when the refresh response omits it", async () => {
    const refresh = encryptGoogleSecret("refresh", `refresh:${owner}:sub`);
    sql.mockResolvedValueOnce([{ google_subject: "sub", refresh_ciphertext: refresh, expires_at: new Date(0).toISOString(), version: 1 }]).mockResolvedValueOnce([{ owner }]).mockResolvedValueOnce([{ owner }]).mockResolvedValueOnce([]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ access_token: "new-access", token_type: "Bearer", expires_in: 3600 })));
    expect(await googleAccessToken(owner)).toBe("new-access");
    expect(sql.mock.calls[2]).toContain(refresh);
    expect(JSON.stringify(sql.mock.calls[2])).not.toContain("new-access");
  });
  it("retains local credentials when revocation temporarily fails", async () => {
    sql.mockResolvedValueOnce([{ google_subject: "sub", refresh_ciphertext: encryptGoogleSecret("refresh", `refresh:${owner}:sub`), version: 1 }]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("unavailable", { status: 503 })));
    await expect(disconnectGoogle(owner)).rejects.toThrow("revocation failed");
    expect(sql).toHaveBeenCalledTimes(1);
  });
});
