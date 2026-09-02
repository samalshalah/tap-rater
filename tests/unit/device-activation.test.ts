import { describe, expect, it, vi } from "vitest";
import {
  activateDeviceWithClient,
  generateGoogleReviewUrl,
  hashActivationCode,
  normalizeDeviceCode,
  normalizeDestinationType,
  validateActivationCode,
  validateActivationDestinationUrl,
  type ActivationDbClient
} from "@/lib/device-activation";

describe("device activation", () => {
  it("normalizes public device codes", () => {
    expect(normalizeDeviceCode(" tr-demo-google ")).toBe("TR-DEMO-GOOGLE");
    expect(normalizeDeviceCode("bad code")).toBeNull();
  });

  it("hashes and validates private activation codes without storing the raw code", () => {
    const hash = hashActivationCode(" tap-123 ");

    expect(hash).toHaveLength(64);
    expect(hash).not.toContain("tap-123");
    expect(validateActivationCode("TAP-123", hash)).toBe(true);
    expect(validateActivationCode("wrong", hash)).toBe(false);
  });

  it("accepts only http and https destination URLs", () => {
    expect(validateActivationDestinationUrl("https://g.page/r/example")).toBe(true);
    expect(validateActivationDestinationUrl("http://example.com")).toBe(true);
    expect(validateActivationDestinationUrl("javascript:alert(1)")).toBe(false);
    expect(validateActivationDestinationUrl("data:text/html,test")).toBe(false);
    expect(validateActivationDestinationUrl("not-a-url")).toBe(false);
  });

  it("generates Google review links from place IDs", () => {
    expect(generateGoogleReviewUrl("CftdcrugMuoHEAE")).toBe("https://g.page/r/CftdcrugMuoHEAE/review");
    expect(generateGoogleReviewUrl("ChIJ-test place")).toBe("https://g.page/r/ChIJ-test%20place/review");
  });

  it("maps activation destination types to platform destination types", () => {
    expect(normalizeDestinationType("google_review_url")).toBe("google_review");
    expect(normalizeDestinationType("direct_url")).toBe("custom");
    expect(normalizeDestinationType("facebook_url")).toBe("facebook_review");
  });

  it("activates an unactivated device and saves customer, business, and destination data", async () => {
    const db = createActivationDb({
      devices: [
        {
          id: "device-1",
          device_code: "TR123",
          activation_code_hash: hashActivationCode("PRIVATE-1"),
          status: "unactivated"
        }
      ]
    });

    const result = await activateDeviceWithClient(db.client, {
      deviceCode: "TR123",
      activationCode: "PRIVATE-1",
      email: "owner@example.com",
      name: "Owner Name",
      businessName: "Local Shop",
      destinationType: "google_review_url",
      destinationUrl: "https://g.page/r/local-shop"
    });

    expect(result).toEqual({ ok: true, deviceCode: "TR123", redirectPath: "/r/TR123" });
    expect(db.inserted.customers[0]).toMatchObject({ email: "owner@example.com", name: "Owner Name" });
    expect(db.inserted.businesses[0]).toMatchObject({
      customer_id: "customer-1",
      business_name: "Local Shop",
      google_review_url: "https://g.page/r/local-shop",
      status: "active"
    });
    expect(db.updated.devices[0]).toMatchObject({
      status: "active",
      customer_id: "customer-1",
      business_id: "business-1",
      destination_type: "google_review",
      destination_url: "https://g.page/r/local-shop"
    });
    expect(db.inserted.device_activation_attempts.at(-1)).toMatchObject({
      device_code: "TR123",
      email: "owner@example.com",
      success: true,
      reason: "activated"
    });
  });

  it("saves selected Google place data and uses the place name when business name is blank", async () => {
    const db = createActivationDb({
      devices: [
        {
          id: "device-1",
          device_code: "TR123",
          activation_code_hash: hashActivationCode("PRIVATE-1"),
          status: "unactivated"
        }
      ]
    });

    await activateDeviceWithClient(db.client, {
      deviceCode: "TR123",
      activationCode: "PRIVATE-1",
      email: "owner@example.com",
      name: "Owner Name",
      businessName: "",
      destinationType: "google_review_url",
      destinationUrl: generateGoogleReviewUrl("ChIJLocalShop"),
      googlePlaceId: "ChIJLocalShop",
      googlePlaceName: "Local Shop From Google",
      googleFormattedAddress: "123 Main St, Phoenix, AZ"
    });

    expect(db.inserted.businesses[0]).toMatchObject({
      business_name: "Local Shop From Google",
      google_place_id: "ChIJLocalShop",
      google_review_url: "https://g.page/r/ChIJLocalShop/review"
    });
  });

  it("rejects invalid activation codes and logs the failed attempt", async () => {
    const db = createActivationDb({
      devices: [
        {
          id: "device-1",
          device_code: "TR123",
          activation_code_hash: hashActivationCode("PRIVATE-1"),
          status: "unactivated"
        }
      ]
    });

    const result = await activateDeviceWithClient(db.client, {
      deviceCode: "TR123",
      activationCode: "WRONG",
      email: "owner@example.com",
      name: "Owner Name",
      businessName: "Local Shop",
      destinationType: "direct_url",
      destinationUrl: "https://example.com"
    });

    expect(result).toMatchObject({ ok: false, reason: "invalid_activation_code" });
    expect(db.updated.devices).toHaveLength(0);
    expect(db.inserted.device_activation_attempts.at(-1)).toMatchObject({
      device_code: "TR123",
      email: "owner@example.com",
      success: false,
      reason: "invalid_activation_code"
    });
  });
});

type TableName = "devices" | "customers" | "businesses" | "device_activation_attempts";

function createActivationDb(seed: { devices: Array<Record<string, unknown>> }) {
  const rows: Record<TableName, Array<Record<string, unknown>>> = {
    devices: [...seed.devices],
    customers: [],
    businesses: [],
    device_activation_attempts: []
  };
  const inserted: Record<TableName, Array<Record<string, unknown>>> = {
    devices: [],
    customers: [],
    businesses: [],
    device_activation_attempts: []
  };
  const updated: Record<TableName, Array<Record<string, unknown>>> = {
    devices: [],
    customers: [],
    businesses: [],
    device_activation_attempts: []
  };
  let nextCustomer = 1;
  let nextBusiness = 1;

  const client = {
    from(table: TableName) {
      let filters: Array<{ column: string; value: unknown }> = [];

      const matchRows = () =>
        rows[table].filter((row) => filters.every((filter) => row[filter.column] === filter.value));

      const builder = {
        select: vi.fn(() => builder),
        eq: vi.fn((column: string, value: unknown) => {
          filters.push({ column, value });
          return builder;
        }),
        maybeSingle: vi.fn(async () => ({ data: matchRows()[0] ?? null, error: null })),
        insert: vi.fn((value: Record<string, unknown>) => {
          const row = { ...value };
          if (table === "customers") {
            row.id = row.id ?? `customer-${nextCustomer++}`;
          }
          if (table === "businesses") {
            row.id = row.id ?? `business-${nextBusiness++}`;
          }
          inserted[table].push(row);
          rows[table].push(row);
          return builder;
        }),
        update: vi.fn((value: Record<string, unknown>) => {
          const matched = matchRows();
          for (const row of matched) {
            Object.assign(row, value);
            updated[table].push({ ...value });
          }
          return builder;
        }),
        gte: vi.fn(() => builder),
        limit: vi.fn(() => builder),
        then(resolve: (value: { data: Array<Record<string, unknown>>; error: null }) => void) {
          resolve({ data: matchRows(), error: null });
        }
      };

      return builder;
    }
  };

  return { client: client as unknown as ActivationDbClient, inserted, updated };
}
