import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import ContactPage from "@/app/(content)/contact-us/page";

vi.mock("@/components/storefront/section", () => ({
  PageHero: ({ title }: { title: string }) => createElement("h1", null, title),
  SectionShell: ({ children }: { children: React.ReactNode }) => createElement("section", null, children)
}));
vi.mock("@/components/forms/form-security", () => ({
  FormSecurity: () => null,
  useFormSecurity: () => ({ token: "", attempt: 0, setToken: vi.fn(), reset: vi.fn() })
}));

describe("public product feedback entry", () => {
  it("lets guest buyers identify their order without pre-authorizing publication", async () => {
    const html = renderToStaticMarkup(await ContactPage({ searchParams: Promise.resolve({ feedback: "google-review-stand" }) }));
    expect(html).toContain('name="orderNumber"');
    expect(html).toContain('value="Custom Google Review Stand with Your Logo"');
    const consent = html.match(/<input[^>]*name="publishPermission"[^>]*>/)?.[0];
    expect(consent).toBeDefined();
    expect(consent).not.toContain("checked");
    expect(consent).not.toContain("required");
    expect(html).not.toContain('name="attachment"');
    expect(html).toContain('disabled=""'); // Anti-spam token is still required.
  });

  it.each([undefined, { feedback: "unknown-product" }, { feedback: ["google-review-stand", "other"] }])("keeps ordinary contact behavior for %j", async (query) => {
    const html = renderToStaticMarkup(await ContactPage({ searchParams: Promise.resolve(query ?? {}) }));
    expect(html).toContain('name="attachment"');
    expect(html).not.toContain('name="publishPermission"');
    expect(html).not.toContain('name="orderNumber"');
  });
});
