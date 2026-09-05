import { describe, expect, it } from "vitest";
import { readRequestTextWithLimit, RequestBodyTooLargeError, requestContentLengthExceeds } from "@/lib/http-request";

describe("bounded request bodies", () => {
  it("reads a body within the configured limit", async () => {
    const request = new Request("https://taprater.com/api/webhooks/test", { method: "POST", body: "hello" });

    await expect(readRequestTextWithLimit(request, 5)).resolves.toBe("hello");
  });

  it("rejects a streamed body that crosses the limit", async () => {
    const request = new Request("https://taprater.com/api/webhooks/test", { method: "POST", body: "hello" });

    await expect(readRequestTextWithLimit(request, 4)).rejects.toBeInstanceOf(RequestBodyTooLargeError);
  });

  it("rejects an oversized declared content length before reading", async () => {
    const request = new Request("https://taprater.com/api/webhooks/test", {
      method: "POST",
      body: "x",
      headers: { "content-length": "100" }
    });

    expect(requestContentLengthExceeds(request, 10)).toBe(true);
    await expect(readRequestTextWithLimit(request, 10)).rejects.toBeInstanceOf(RequestBodyTooLargeError);
  });
});
