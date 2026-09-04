import { describe, expect, it } from "vitest";
import {
  checkLoginRateLimitWithClient,
  recordLoginAttemptWithClient,
  type LoginRateLimitContext
} from "@/lib/auth-rate-limit";

const context: LoginRateLimitContext = {
  configured: true,
  identifierHash: "identifier-hash",
  ipHash: "ip-hash",
  scope: "admin"
};

describe("login rate limiting", () => {
  it("blocks an identifier after five recent failures", async () => {
    const rows = Array.from({ length: 5 }, (_, index) => ({
      id: String(index),
      scope: "admin",
      identifier_hash: "identifier-hash",
      ip_hash: `ip-${index}`,
      success: false,
      created_at: "2026-09-04T17:55:00.000Z"
    }));

    const result = await checkLoginRateLimitWithClient(createAuthAttemptClient(rows), context, new Date("2026-09-04T18:00:00.000Z"));

    expect(result.limited).toBe(true);
    expect(result.retryAfterSeconds).toBe(900);
  });

  it("ignores successful and expired attempts", async () => {
    const rows = [
      {
        id: "success",
        scope: "admin",
        identifier_hash: "identifier-hash",
        ip_hash: "ip-hash",
        success: true,
        created_at: "2026-09-04T17:59:00.000Z"
      },
      {
        id: "expired",
        scope: "admin",
        identifier_hash: "identifier-hash",
        ip_hash: "ip-hash",
        success: false,
        created_at: "2026-09-04T17:00:00.000Z"
      }
    ];

    const result = await checkLoginRateLimitWithClient(createAuthAttemptClient(rows), context, new Date("2026-09-04T18:00:00.000Z"));

    expect(result.limited).toBe(false);
  });

  it("records only hashed identifiers", async () => {
    const inserts: Record<string, unknown>[] = [];
    const client = {
      from: () => ({
        insert: async (payload: Record<string, unknown>) => {
          inserts.push(payload);
          return { data: null, error: null };
        }
      })
    };

    await recordLoginAttemptWithClient(client, context, false);

    expect(inserts[0]).toMatchObject({
      scope: "admin",
      identifier_hash: "identifier-hash",
      ip_hash: "ip-hash",
      success: false
    });
  });
});

function createAuthAttemptClient(rows: Record<string, unknown>[]) {
  return {
    from: () => new AuthAttemptQuery(rows)
  };
}

class AuthAttemptQuery {
  private filters: Array<{ column: string; operator: "eq" | "gte"; value: unknown }> = [];

  constructor(private readonly rows: Record<string, unknown>[]) {}

  select() {
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, operator: "eq", value });
    return this;
  }

  gte(column: string, value: unknown) {
    this.filters.push({ column, operator: "gte", value });
    return this;
  }

  async limit(limit: number) {
    const data = this.rows
      .filter((row) =>
        this.filters.every((filter) =>
          filter.operator === "eq"
            ? row[filter.column] === filter.value
            : String(row[filter.column]) >= String(filter.value)
        )
      )
      .slice(0, limit);
    return { data, error: null };
  }
}
