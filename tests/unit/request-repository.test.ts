import { describe, expect, it, vi } from "vitest";
import {
  getAdminRequestsFromClient,
  saveChangeLinkRequest,
  saveContactRequest,
  saveSetupRequest,
  type RequestDbClient
} from "@/lib/request-repository";

function createDbClient() {
  const insert = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn(() => ({ insert }));
  return { client: { from } as unknown as RequestDbClient, from, insert };
}

describe("request repository", () => {
  it("stores contact requests in contact_requests", async () => {
    const db = createDbClient();

    await saveContactRequest(db.client, {
      name: "Customer",
      email: "customer@example.com",
      message: "Please help with my Tap Rater setup."
    });

    expect(db.from).toHaveBeenCalledWith("contact_requests");
    expect(db.insert).toHaveBeenCalledWith({
      name: "Customer",
      email: "customer@example.com",
      message: "Please help with my Tap Rater setup."
    });
  });

  it("maps setup requests to database column names", async () => {
    const db = createDbClient();

    await saveSetupRequest(db.client, {
      name: "Customer",
      email: "customer@example.com",
      businessName: "Local Shop",
      reviewUrl: "https://example.com/review",
      notes: ""
    });

    expect(db.from).toHaveBeenCalledWith("setup_requests");
    expect(db.insert).toHaveBeenCalledWith({
      name: "Customer",
      email: "customer@example.com",
      business_name: "Local Shop",
      review_url: "https://example.com/review",
      notes: ""
    });
  });

  it("maps change-link requests to database column names", async () => {
    const db = createDbClient();

    await saveChangeLinkRequest(db.client, {
      name: "Customer",
      email: "customer@example.com",
      tapraterId: "TRATER01-W",
      newReviewUrl: "https://example.com/new-review",
      notes: "Use this new link."
    });

    expect(db.from).toHaveBeenCalledWith("change_link_requests");
    expect(db.insert).toHaveBeenCalledWith({
      name: "Customer",
      email: "customer@example.com",
      taprater_id: "TRATER01-W",
      new_review_url: "https://example.com/new-review",
      notes: "Use this new link."
    });
  });

  it("loads all admin request tables newest first", async () => {
    const tables: Record<string, unknown[]> = {
      contact_requests: [
        {
          id: "contact-1",
          name: "Contact Customer",
          email: "contact@example.com",
          message: "I need help.",
          status: "new",
          admin_notes: "Needs a reply.",
          updated_at: "2026-07-09T12:30:00.000Z",
          created_at: "2026-07-09T12:00:00.000Z"
        }
      ],
      setup_requests: [
        {
          id: "setup-1",
          name: "Setup Customer",
          email: "setup@example.com",
          business_name: "Local Shop",
          review_url: "https://example.com/review",
          notes: "Need setup.",
          created_at: "2026-07-09T11:00:00.000Z"
        }
      ],
      change_link_requests: [
        {
          id: "change-1",
          name: "Change Customer",
          email: "change@example.com",
          taprater_id: "TRATER01-W",
          new_review_url: "https://example.com/new",
          notes: "Change link.",
          status: "open",
          resolved_at: null,
          created_at: "2026-07-09T10:00:00.000Z"
        }
      ]
    };
    const order = vi.fn((column: string, options: { ascending: boolean }) => {
      expect(column).toBe("created_at");
      expect(options).toEqual({ ascending: false });
      return Promise.resolve({ data: tables[currentTable], error: null });
    });
    let currentTable = "";
    const client = {
      from(table: string) {
        currentTable = table;
        return {
          select(columns?: string) {
            expect(columns).toBe("*");
            return { order };
          }
        };
      }
    };

    const requests = await getAdminRequestsFromClient(client);

    expect(requests.contacts[0]).toMatchObject({
      name: "Contact Customer",
      status: "new",
      adminNotes: "Needs a reply.",
      updatedAt: "2026-07-09T12:30:00.000Z"
    });
    expect(requests.setups[0]).toMatchObject({
      businessName: "Local Shop",
      reviewUrl: "https://example.com/review",
      status: "new",
      adminNotes: ""
    });
    expect(requests.linkChanges[0]).toMatchObject({ tapraterId: "TRATER01-W", status: "in_progress" });
    expect(order).toHaveBeenCalledTimes(3);
  });
});
