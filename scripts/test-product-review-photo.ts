// Runs only against the disposable review QA database and a local Next dev server.
// No email is sent. Fixtures are retained until the temporary branch expires.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { reviewDb, reviewToken } from "../src/lib/product-reviews";

async function main() {
const hostname = new URL(process.env.DATABASE_URL || "http://unconfigured").hostname;
assert.equal(hostname, "ep-winter-feather-at2enh5j-pooler.c-9.us-east-1.aws.neon.tech", "This script must only use the disposable review QA branch.");
const base = "http://localhost:3117";
const id = randomUUID(); const sql = reviewDb();
const [row] = await sql`INSERT INTO product_review_invitations (id, customer_name, email, email_status)
  VALUES (${id}, 'QA Photo Customer', ${`photo-${id}@example.invalid`}, 'sent') RETURNING *`;
const form = new FormData();
form.set("token", reviewToken(id, row.expires_at)); form.set("rating", "3");
form.set("displayName", "QA Photo"); form.set("body", "QA TEST ONLY: Optional photo upload and submission check.");
form.set("publishPermission", "true"); form.set("photoPermission", "true");
const photo = await sharp({ create: { width: 160, height: 120, channels: 3, background: "#6035ff" } }).jpeg().toBuffer();
form.set("photo", new Blob([new Uint8Array(photo)], { type: "image/jpeg" }), "qa.jpg");
const result = await fetch(`${base}/api/product-reviews`, { method: "POST", headers: { Origin: base }, body: form });
assert.equal(result.status, 200, await result.text());
const [saved] = await sql`SELECT rating, photo_key, moderation_status, photo_permission FROM product_review_invitations WHERE id = ${id}`;
assert.equal(saved.rating, 3); assert.equal(saved.moderation_status, "pending"); assert.equal(saved.photo_permission, true);
assert.match(saved.photo_key, /^product-reviews\//);
const image = await fetch(`${base}/api/product-reviews/photo/${id}`);
assert.equal(image.status, 200); assert.equal(image.headers.get("content-type"), "image/jpeg");
assert.equal((await sharp(Buffer.from(await image.arrayBuffer())).metadata()).width, 160);
const replay = await fetch(`${base}/api/product-reviews`, { method: "POST", headers: { Origin: base }, body: form });
assert.equal(replay.status, 409);
const publicBypass = await fetch(`${base}/api/media/product/${saved.photo_key}`);
assert.equal(publicBypass.status, 400);
console.log("PASS: optional photo saved with pending review; photo decodes; duplicate submission and public media bypass rejected. No emails sent.");
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Photo QA failed."); process.exitCode = 1; });
