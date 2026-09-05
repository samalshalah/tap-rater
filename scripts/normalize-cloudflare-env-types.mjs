import { readFile, writeFile } from "node:fs/promises";

const path = "cloudflare-env.d.ts";
const source = await readFile(path, "utf8");
const normalized = source.replace(
  /interface ProcessEnv extends StringifyValues<(.+)> \{\}/u,
  "interface ProcessEnv extends Partial<StringifyValues<$1>> {}"
);

if (normalized === source) {
  throw new Error("Wrangler ProcessEnv declaration was not found. Review the generated type format.");
}

await writeFile(path, normalized, "utf8");
console.log("Normalized generated ProcessEnv variables as optional runtime values.");
