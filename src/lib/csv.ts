export type CsvParseResult = {
  headers: string[];
  rows: Record<string, string>[];
};

export function encodeCsv(rows: Record<string, unknown>[], headers: string[]) {
  return [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvCell(row[header] ?? "")).join(","))
  ].join("\r\n");
}

export function parseCsv(input: string): CsvParseResult {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (quoted) {
      if (char === "\"" && next === "\"") {
        cell += "\"";
        index += 1;
      } else if (char === "\"") {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === "\"") {
      if (cell.length > 0) {
        throw new Error("Malformed CSV: unexpected quote in unquoted field.");
      }
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(cell);
      cell = "";
      if (row.some((value) => value.length > 0)) {
        rows.push(row);
      }
      row = [];
    } else {
      cell += char;
    }
  }

  if (quoted) {
    throw new Error("Malformed CSV: unterminated quoted field.");
  }

  row.push(cell);
  if (row.some((value) => value.length > 0)) {
    rows.push(row);
  }

  const headers = rows.shift()?.map((header) => header.trim()) ?? [];
  if (headers.length === 0) {
    throw new Error("CSV header row is required.");
  }

  return {
    headers,
    rows: rows.map((values) =>
      Object.fromEntries(headers.map((header, index) => [header, unescapeSpreadsheetFormula(values[index] ?? "")]))
    )
  };
}

function escapeCsvCell(value: unknown) {
  const text = escapeSpreadsheetFormula(String(value ?? ""));
  return /[",\r\n]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

function escapeSpreadsheetFormula(value: string) {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function unescapeSpreadsheetFormula(value: string) {
  return /^'[=+\-@]/.test(value) ? value.slice(1) : value;
}
