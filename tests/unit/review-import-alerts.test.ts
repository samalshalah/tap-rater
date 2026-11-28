import { describe, expect, it, vi } from "vitest";
import { describeClientFailure, failureAlertSubject } from "@/lib/client-failure-message";
import { collectBackgroundFailures } from "@/lib/client-failures";
import { GoogleBusinessError } from "@/lib/google-business/client";
import { reviewSyncErrorMessage } from "@/lib/google-business/live-review-workspaces";

describe("Google review refresh alerts", () => {
  it("saves a friendly sync error that keeps Google's cause", () => {
    expect(reviewSyncErrorMessage(new GoogleBusinessError("quota", 429))).toBe("Sync failed. Google is limiting requests for now. Tap Rater retries automatically. (Google quota 429)");
    expect(reviewSyncErrorMessage(new GoogleBusinessError("reconnect", 401))).toContain("Reconnect Google. (Google reconnect 401)");
    expect(reviewSyncErrorMessage(new Error("boom"))).toBe("Sync failed. Reconnect Google or check API access and quota.");
  });

  it("names refresh problems as refresh problems, not replies to write", () => {
    const one = [{ code: "review_import", business_name: "Family First Smiles" }];
    expect(failureAlertSubject("review", one)).toBe("Tap Rater: Family First Smiles — Google reviews couldn't refresh");
    expect(failureAlertSubject("review", [...one, { code: "review_import", business_name: "Chill Tobacco" }])).toBe("Tap Rater: Google reviews couldn't refresh at 2 locations");
    expect(failureAlertSubject("review", [...one, { code: "review_draft", business_name: "Chill Tobacco" }])).toBe("Tap Rater: 2 Google review alerts need review");
    expect(failureAlertSubject("review", [{ code: "review_draft" }, { code: "review_draft" }])).toBe("Tap Rater: 2 Google replies need review");
    expect(failureAlertSubject("review", [{ code: "review_draft", business_name: "Family First Smiles" }])).toBe("Tap Rater: Family First Smiles — Google reply needs review");
  });

  it("shows Google's status and the right next step", () => {
    expect(describeClientFailure({ code: "review_import", http_status: 429, business_name: "Bingo Tires" })).toContain("Google status: 429 (request limit).");
    expect(describeClientFailure({ code: "review_import", http_status: 401 })).toContain("Reconnect Google for this location");
    expect(describeClientFailure({ code: "review_import" })).toContain("Google Reviews have not refreshed for over an hour. Recorded once.");
  });

  it("only records a refresh failure after an hour without a successful refresh, with Google's status", async () => {
    const sql = vi.fn()
      .mockResolvedValueOnce([{ customer_id: "c1", business_id: "b1", code: "review_import" }])
      .mockResolvedValueOnce([{ business_id: "b1", status: 429 }])
      .mockResolvedValue([]);
    await collectBackgroundFailures(sql as never);
    const collector = sql.mock.calls[0][0].join("?");
    expect(collector).toContain("l.synced_at<now()-interval '1 hour'");
    const insert = sql.mock.calls.find((call) => call[0].join("?").includes("INSERT INTO client_failures"));
    expect(insert).toBeDefined();
    expect(insert!.slice(1)).toContain(429);
  });
});
