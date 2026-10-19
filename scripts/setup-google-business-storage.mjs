import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

// Run explicitly with the target database environment already loaded.
if (!process.argv.includes("--apply")) throw new Error("Use --apply to create the Google connection tables.");
const url = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
if (!url) throw new Error("Database environment is required.");
const sql = neon(url);
const source = readFileSync(new URL("../docs/sql/google-business.sql", import.meta.url), "utf8");
const statements = source.replace(/^--.*$/gm, "").split(";").map(value => value.trim()).filter(value => value && value !== "BEGIN" && value !== "COMMIT");
try {
  await sql.transaction(statements.map(statement => sql.query(statement)));
  const rows = await sql`SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('google_business_connections', 'google_business_oauth_attempts')`;
  if (rows.length !== 2 || rows.some(row => !row.relrowsecurity)) throw new Error("Storage verification failed.");
  console.log("Google connection tables created; row-level security enabled.");
} catch { console.error("Google storage setup failed. Check database permissions and connectivity."); process.exitCode = 1; }
