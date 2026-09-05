import { writeFile } from "node:fs/promises";

if (!process.argv.includes("--create-test-checkout")) throw new Error("Explicit test checkout opt-in required.");
const payload = {
  checkoutAttemptId: "phase1-release-20260905-01",
  items: [{ productId: "google-review-stand", optionId: "standard_direct", quantity: 1,
    setup: { destinationUrl: "https://taprater.com", proofApproved: true } }],
  customer: { email: "info@horizonlight.us", name: "Phase 1 Release QA - Do Not Fulfill", phone: "2025550142", createAccount: false },
  shippingAddress: { name: "Phase 1 Release QA - Do Not Fulfill", line1: "100 Test Street", line2: "Test order only", city: "Richmond", state: "VA", postalCode: "23219", country: "US", phone: "2025550142" },
};
const response = await fetch("https://taprater.com/api/checkout", {
  method: "POST", headers: { "content-type": "application/json", origin: "https://taprater.com" }, body: JSON.stringify(payload),
});
const body = await response.json();
if (!response.ok) throw new Error(`Checkout failed (${response.status}): ${body.error ?? "Unknown error"}`);
if (!body.sessionId?.startsWith("cs_test_")) throw new Error("Checkout is not in test mode. Do not submit payment.");
const evidence = { sessionId: body.sessionId, checkoutUrl: `https://taprater.com/checkout?session_id=${body.sessionId}`, createdAt: new Date().toISOString(), checkoutAttemptId: payload.checkoutAttemptId };
await writeFile("artifacts/ecommerce-phase-1/release-checkout.json", JSON.stringify(evidence, null, 2) + "\n");
console.log(JSON.stringify(evidence));
