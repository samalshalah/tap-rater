import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
if (!process.argv.includes("--apply")) throw new Error("Use --apply with the intended database environment.");
const businessId = process.argv.find(arg => arg.startsWith("--business-id="))?.split("=")[1];
const email = process.argv.find(arg => arg.startsWith("--owner-email="))?.split("=")[1]?.trim().toLowerCase();
if (!businessId || !email) throw new Error("Explicit --business-id and --owner-email are required.");
const sql = neon(process.env.DATABASE_URL || process.env.NEON_DATABASE_URL);
const businesses = await sql`SELECT b.id,b.business_name FROM businesses b JOIN customers c ON c.id=b.customer_id
 WHERE b.id=${businessId} AND lower(c.email)=${email} AND c.account_status='active'`;
if (businesses.length !== 1) throw new Error("Expected active customer/business relationship was not found.");
const source = readFileSync(new URL("../docs/sql/review-workspaces.sql", import.meta.url), "utf8");
const statements = source.split(";").map(s=>s.trim()).filter(s=>s && s!=="BEGIN" && s!=="COMMIT");
await sql.transaction(statements.map(s=>sql.query(s)));
const samples = [
 ["01-service","Sample shopper A",5,"The team helped me find a lovely outfit for a family celebration. I appreciated their patience while I tried different styles."],
 ["02-sizing","Sample shopper B",4,"Beautiful pieces and helpful service. A clearer size guide would make it easier to choose before visiting."],
 ["03-availability","Sample shopper C",3,"I liked the collection, but the color I wanted was unavailable. I would love a way to hear when it is back in stock."],
 ["04-experience","Sample shopper D",2,"I felt rushed while asking about an exchange. I left unsure about the next step and wish the policy had been explained more clearly."]
];
await sql.transaction([
 sql`INSERT INTO review_workspaces (business_id) VALUES (${businessId}) ON CONFLICT DO NOTHING`,
 ...samples.map(([key,name,rating,comment])=>sql`INSERT INTO workspace_sample_reviews (business_id,sample_key,reviewer,rating,comment)
 VALUES (${businessId},${key},${name},${rating},${comment}) ON CONFLICT (business_id,sample_key) DO NOTHING`)
]);
console.log(JSON.stringify({business:businesses[0].business_name,owner:email,mode:"sample",reviews:4}));
