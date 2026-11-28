import { invitationSchema } from "@/lib/product-review-shared";

/**
 * Reads a customer list (Excel .xlsx or .csv) for bulk review invitations. Runs in the browser:
 * nothing is uploaded until the admin reviews the preview and starts sending.
 */
export const reviewImportRowLimit = 500;

export type ReviewImportRow = { line: number; name: string; email: string; status: "ready" | "invalid" | "duplicate"; reason?: string };
export type ReviewImportResult = { rows: ReviewImportRow[]; ready: number; skipped: number; truncated: boolean; error?: string };

// ---------- CSV ----------

/** RFC 4180-style CSV: quoted fields, doubled quotes, commas/semicolons/tabs, CRLF or LF. */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, "");
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = [",", ";", "\t"].sort((a, b) => firstLine.split(b).length - firstLine.split(a).length)[0];
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"' && clean[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"' && field === "") quoted = true;
    else if (ch === delimiter) { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && clean[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += ch;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter((cells) => cells.some((cell) => cell.trim()));
}

// ---------- XLSX (a zip of XML files) ----------

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function unzip(buffer: ArrayBuffer): Promise<Map<string, string>> {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 66000); i--) if (view.getUint32(i, true) === 0x06054b50) { end = i; break; }
  if (end < 0) throw new Error("This file is not a valid Excel workbook.");
  const count = view.getUint16(end + 10, true);
  let offset = view.getUint32(end + 16, true);
  const files = new Map<string, string>();
  const decoder = new TextDecoder();
  for (let i = 0; i < count; i++) {
    if (view.getUint32(offset, true) !== 0x02014b50) break;
    const method = view.getUint16(offset + 10, true);
    const size = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true), extraLength = view.getUint16(offset + 30, true), commentLength = view.getUint16(offset + 32, true);
    const local = view.getUint32(offset + 42, true);
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    offset += 46 + nameLength + extraLength + commentLength;
    if (!/^xl\/(workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|worksheets\/[^/]+\.xml)$/.test(name)) continue;
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    const raw = bytes.subarray(start, start + size);
    files.set(name, decoder.decode(method === 0 ? raw : await inflateRaw(raw)));
  }
  return files;
}

const decodeXml = (value: string) => value
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
  .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
  .replace(/&amp;/g, "&");
const textOf = (xml: string) => [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((match) => decodeXml(match[1])).join("");
const columnIndex = (ref: string) => [...ref.replace(/\d+$/, "")].reduce((sum, ch) => sum * 26 + ch.charCodeAt(0) - 64, 0) - 1;

/** The first sheet of an .xlsx workbook as rows of text. */
export async function parseXlsx(buffer: ArrayBuffer): Promise<string[][]> {
  const files = await unzip(buffer);
  const shared = [...(files.get("xl/sharedStrings.xml") ?? "").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((match) => textOf(match[1]));
  // First sheet in workbook order; fall back to sheet1.
  const firstId = files.get("xl/workbook.xml")?.match(/<sheet\b[^>]*\br:id="([^"]+)"/)?.[1];
  const target = firstId ? files.get("xl/_rels/workbook.xml.rels")?.match(new RegExp(`<Relationship\\b[^>]*Id="${firstId}"[^>]*Target="([^"]+)"`))?.[1] ?? files.get("xl/_rels/workbook.xml.rels")?.match(new RegExp(`<Relationship\\b[^>]*Target="([^"]+)"[^>]*Id="${firstId}"`))?.[1] : undefined;
  const sheetPath = target ? `xl/${target.replace(/^\/?xl\//, "").replace(/^\//, "")}` : "xl/worksheets/sheet1.xml";
  const sheet = files.get(sheetPath) ?? files.get("xl/worksheets/sheet1.xml");
  if (!sheet) throw new Error("The workbook has no readable sheet.");
  const rows: string[][] = [];
  for (const rowMatch of sheet.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row: string[] = [];
    for (const cell of rowMatch[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cell[1], body = cell[2] ?? "";
      const ref = attrs.match(/\br="([A-Z]+\d+)"/)?.[1];
      const type = attrs.match(/\bt="([^"]+)"/)?.[1];
      const value = body.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      const text = type === "s" ? shared[Number(value)] ?? "" : type === "inlineStr" ? textOf(body) : decodeXml(value ?? "");
      row[ref ? columnIndex(ref) : row.length] = text;
    }
    rows.push(Array.from(row, (cell) => cell ?? ""));
  }
  return rows.filter((cells) => cells.some((cell) => cell.trim()));
}

// ---------- Rows -> invitations ----------

const headerKey = (value: string) => value.trim().toLowerCase().replace(/[^a-z]/g, "");
const emailHeaders = new Set(["email", "emailaddress", "email1", "customeremail", "mail"]);
const nameHeaders = new Set(["name", "fullname", "customername", "customer", "contactname", "buyername", "displayname"]);
const firstHeaders = new Set(["firstname", "first", "givenname"]);
const lastHeaders = new Set(["lastname", "last", "surname", "familyname"]);

/** Finds the name and email columns (by header, or by content when there is no header row) and checks every row. */
export function toInvitationRows(table: string[][]): ReviewImportResult {
  if (!table.length) return { rows: [], ready: 0, skipped: 0, truncated: false, error: "The file is empty." };
  const header = table[0].map(headerKey);
  let email = header.findIndex((key) => emailHeaders.has(key) || key.includes("email"));
  let name = header.findIndex((key) => nameHeaders.has(key));
  const first = header.findIndex((key) => firstHeaders.has(key)), last = header.findIndex((key) => lastHeaders.has(key));
  const hasHeader = email >= 0;
  if (!hasHeader) {
    // No header row: the email column is the one with @ in it; the name is the first other text column.
    email = table[0].findIndex((cell) => cell.includes("@"));
    name = table[0].findIndex((cell, index) => index !== email && cell.trim() && !cell.includes("@"));
  }
  if (email < 0) return { rows: [], ready: 0, skipped: 0, truncated: false, error: "No email column found. Add a column named “Email”." };
  const data = hasHeader ? table.slice(1) : table;
  const truncated = data.length > reviewImportRowLimit;
  const seen = new Set<string>();
  const rows = data.slice(0, reviewImportRowLimit).map((cells, index): ReviewImportRow => {
    const line = index + (hasHeader ? 2 : 1);
    const fullName = name >= 0 ? cells[name] ?? "" : [first >= 0 ? cells[first] : "", last >= 0 ? cells[last] : ""].filter(Boolean).join(" ");
    const parsed = invitationSchema.safeParse({ name: fullName.replace(/\s+/g, " "), email: cells[email] ?? "" });
    if (!parsed.success) {
      const reason = !fullName.trim() ? "Missing name" : !String(cells[email] ?? "").trim() ? "Missing email" : "Invalid email";
      return { line, name: fullName.trim(), email: String(cells[email] ?? "").trim(), status: "invalid", reason };
    }
    if (seen.has(parsed.data.email)) return { line, ...parsed.data, status: "duplicate", reason: "Same email earlier in the file" };
    seen.add(parsed.data.email);
    return { line, ...parsed.data, status: "ready" };
  });
  const ready = rows.filter((row) => row.status === "ready").length;
  return { rows, ready, skipped: rows.length - ready, truncated };
}

export async function readReviewImportFile(file: File): Promise<ReviewImportResult> {
  try {
    const lower = file.name.toLowerCase();
    if (lower.endsWith(".xlsx")) return toInvitationRows(await parseXlsx(await file.arrayBuffer()));
    if (lower.endsWith(".csv") || lower.endsWith(".txt")) return toInvitationRows(parseCsv(await file.text()));
    return { rows: [], ready: 0, skipped: 0, truncated: false, error: "Use an Excel .xlsx file or a .csv file. Older .xls files: save as .xlsx first." };
  } catch (error) {
    return { rows: [], ready: 0, skipped: 0, truncated: false, error: error instanceof Error ? error.message : "The file could not be read." };
  }
}
