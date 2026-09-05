import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ configured: vi.fn(), db: vi.fn() }));
vi.mock("@/lib/db", () => ({ hasSupabaseAdminConfig: mocks.configured, getSupabaseAdmin: mocks.db }));
import { consumeCustomerRecoveryAttempt } from "@/lib/auth-rate-limit";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("ADMIN_SESSION_SECRET", "recovery-test-secret");
  mocks.configured.mockReturnValue(true);
});
afterEach(() => vi.unstubAllEnvs());

function database(identifierCount = 0, ipCount = 0, failRead = false, failWrite = false) {
  const insert = vi.fn().mockResolvedValue({ error: failWrite ? { message: "failed" } : null });
  mocks.db.mockImplementation(() => ({ from: () => {
    let ip = false;
    const builder = {
      select: () => builder,
      eq: (column: string) => { if (column === "ip_hash") ip = true; return builder; },
      gte: () => builder,
      limit: async () => ({ data: Array.from({ length: ip ? ipCount : identifierCount }, (_, id) => ({ id })), error: failRead ? { message: "failed" } : null }),
      insert
    };
    return builder;
  } }));
  return insert;
}
const headers = new Headers({ "cf-connecting-ip": "203.0.113.10" });

describe("customer recovery throttling", () => {
  it("counts every accepted request using private identifiers in its own scope", async () => {
    const insert = database();
    expect(await consumeCustomerRecoveryAttempt(headers, "request:owner@example.com")).toMatchObject({ available: true, limited: false });
    expect(insert.mock.calls[0][0]).toMatchObject({ scope: "customer_recovery", success: false });
    expect(JSON.stringify(insert.mock.calls[0][0])).not.toContain("owner@example.com");
    expect(JSON.stringify(insert.mock.calls[0][0])).not.toContain("203.0.113.10");
  });
  it.each([[5, 0], [0, 20]])("blocks when identifier count=%s, IP count=%s", async (identifierCount, ipCount) => {
    const insert = database(identifierCount, ipCount);
    expect(await consumeCustomerRecoveryAttempt(headers, "request:owner@example.com")).toMatchObject({ available: true, limited: true });
    expect(insert).not.toHaveBeenCalled();
  });
  it.each([[true, false], [false, true]])("fails closed on read=%s/write=%s failure", async (read, write) => {
    database(0, 0, read, write);
    expect(await consumeCustomerRecoveryAttempt(headers, "request:owner@example.com")).toMatchObject({ available: false });
  });
  it("does not operate without configured persistence", async () => {
    mocks.configured.mockReturnValue(false);
    expect(await consumeCustomerRecoveryAttempt(headers, "request:owner@example.com")).toMatchObject({ available: false });
    expect(mocks.db).not.toHaveBeenCalled();
  });
});
