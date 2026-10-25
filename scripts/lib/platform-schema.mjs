export const REQUIRED_PLATFORM_TABLES = [
  "customers",
  "businesses",
  "devices",
  "landing_pages",
  "tap_events",
  "form_submissions",
  "device_activation_attempts"
];

export function checkSchemaText(sqlText) {
  const missingTables = REQUIRED_PLATFORM_TABLES.filter((tableName) => {
    const escapedTableName = tableName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const tablePattern = new RegExp(`create\\s+table\\s+if\\s+not\\s+exists\\s+(public\\.)?${escapedTableName}\\b`, "i");
    return !tablePattern.test(sqlText);
  });

  return {
    ok: missingTables.length === 0,
    missingTables
  };
}

