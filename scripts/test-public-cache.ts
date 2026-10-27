import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { writeFileSync, existsSync, readdirSync, readFileSync, unlinkSync } from "node:fs";
import { resolve, join } from "node:path";
import { defaultHomepageContent, defaultHeaderNavigation, defaultFooterContent } from "../src/lib/website-content";
import { createAdminSessionValue } from "../src/lib/admin-auth";

// Isolated fake database and credentials: never loads production secrets or writes live data.
const env = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:4352", SUPABASE_SERVICE_ROLE_KEY: "local-cache-regression-test", DATABASE_URL: "", NEON_DATABASE_URL: "", PUBLIC_DATA_CACHE_ENABLED: "true", ADMIN_EMAIL: "cache-test@example.test", ADMIN_SESSION_SECRET: "local-only-cache-test-secret-20261027" };
process.env.ADMIN_EMAIL = env.ADMIN_EMAIL;
process.env.ADMIN_SESSION_SECRET = env.ADMIN_SESSION_SECRET;
const content = { ...defaultHomepageContent, header: structuredClone(defaultHeaderNavigation), footer: structuredClone(defaultFooterContent) };
content.header.items[0].label = "Cache original";
const records = new Map<string, unknown>([["navigation.header", content.header], ["navigation.footer", content.footer]]);
let reads = 0;
const database = createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  const url = new URL(req.url!, "http://127.0.0.1:4352");
  if (req.method === "GET") {
    reads++;
    const rows = [...records].map(([key, payload]) => ({ key, payload }));
    res.end(JSON.stringify(rows));
  } else {
    let raw=""; for await(const chunk of req) raw+=chunk;
    const row=JSON.parse(raw); records.set(row.key,row.payload);
    res.end(JSON.stringify(row));
  }
});
async function main() {
  await new Promise<void>(resolve => database.listen(4352,"127.0.0.1",resolve));
  const server=spawn(process.execPath,["node_modules/next/dist/bin/next","start","-p","4351"],{env,stdio:["ignore","pipe","pipe"]});
  let log=""; server.stdout.on("data",d=>{log+=d;});server.stderr.on("data",d=>{log+=d;});
  const base="http://127.0.0.1:4351";
  try {
    let ready=false;
    for(let i=0;i<60;i++) {try {const r=await fetch(base+"/api/site/website-content");if(r.ok){ready=true;break;}}catch{} await new Promise(r=>setTimeout(r,500));}
    assert(ready,"production server must start");
    // Clear any persistent result left by a previous test through the real save path.
    const seeded = await fetch(base+"/api/admin/website",{method:"POST",headers:{"Content-Type":"application/json",Cookie:`taprater_admin=${createAdminSessionValue(env.ADMIN_EMAIL)}`},body:JSON.stringify(content)});
    assert.equal(seeded.status,200,await seeded.text());
    const read=async()=>{const r=await fetch(base+"/api/site/website-content");assert.equal(r.status,200);return r.json();};
    const initial=await read(); const before=reads;
    assert.equal(initial.header.items[0].label,"Cache original");
    await read();await read(); assert.equal(reads,before,"warm reads must not hit the database");
    const denied=await fetch(base+"/api/admin/website",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(content)});
    assert.equal(denied.status,401);
    content.header.items[0].label="Cache updated";
    const saved=await fetch(base+"/api/admin/website",{method:"POST",headers:{"Content-Type":"application/json",Cookie:`taprater_admin=${createAdminSessionValue(env.ADMIN_EMAIL)}`},body:JSON.stringify(content)});
    assert.equal(saved.status,200,await saved.text());
    assert.equal((await read()).header.items[0].label,"Cache updated","successful admin save must invalidate the cached content");
    assert.equal(reads,before+1,"one new batch read after invalidation");
    const result={passed:true,checks:["production cache hits","one batched content read","unauthenticated edit rejected","authenticated save invalidates immediately"],databaseReads:reads};
    writeFileSync("speed-cache-integration.json",JSON.stringify(result,null,2)); console.log(result);
  } finally {
    await new Promise<void>(done => { server.once("exit", () => done()); server.kill(); });
    database.close();writeFileSync("speed-cache-server.log",log);
    // Do not let the next OpenNext build package this test's fake content.
    const cacheDirectory = resolve(process.cwd(), ".next/cache/fetch-cache");
    if (existsSync(cacheDirectory)) for (const file of readdirSync(cacheDirectory, { withFileTypes: true })) {
      if (!file.isFile()) continue;
      const path = join(cacheDirectory, file.name);
      if (/Cache original|Cache updated/.test(readFileSync(path, "utf8"))) unlinkSync(path);
    }
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
