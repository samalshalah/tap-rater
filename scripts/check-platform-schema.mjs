#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { checkSchemaText } from "./lib/platform-schema.mjs";
export { checkSchemaText, REQUIRED_PLATFORM_TABLES } from "./lib/platform-schema.mjs";

export function checkSchemaFile(schemaPath) {
  const sqlText = readFileSync(schemaPath, "utf8");
  return checkSchemaText(sqlText);
}

function printResult(schemaPath, result) {
  if (result.ok) {
    console.log(`PASS platform schema tables present in ${schemaPath}`);
    return;
  }

  console.error(`FAIL platform schema tables missing from ${schemaPath}:`);
  for (const tableName of result.missingTables) {
    console.error(`- ${tableName}`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const schemaPath = resolve(process.argv[2] || "supabase/schema.sql");
  const result = checkSchemaFile(schemaPath);
  printResult(schemaPath, result);

  if (!result.ok) {
    process.exitCode = 1;
  }
}
