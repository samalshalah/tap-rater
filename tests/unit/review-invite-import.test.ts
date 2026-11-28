import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { parseCsv, parseXlsx, toInvitationRows } from "@/lib/review-invite-import";

/** A minimal real .xlsx (zip of XML) so the reader is tested against an actual workbook. */
function makeXlsx(files: Record<string, string>) {
  const locals: Buffer[] = [], centrals: Buffer[] = [];
  let offset = 0;
  for (const [name, text] of Object.entries(files)) {
    const nameBytes = Buffer.from(name), raw = Buffer.from(text), data = deflateRawSync(raw);
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(8, 8); local.writeUInt32LE(data.length, 18); local.writeUInt32LE(raw.length, 22); local.writeUInt16LE(nameBytes.length, 26);
    const central = Buffer.alloc(46); central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(8, 10); central.writeUInt32LE(data.length, 20); central.writeUInt32LE(raw.length, 24); central.writeUInt16LE(nameBytes.length, 28); central.writeUInt32LE(offset, 42);
    locals.push(local, nameBytes, data); centrals.push(central, nameBytes);
    offset += 30 + nameBytes.length + data.length;
  }
  const centralSize = centrals.reduce((sum, b) => sum + b.length, 0);
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(Object.keys(files).length, 8); end.writeUInt16LE(Object.keys(files).length, 10); end.writeUInt32LE(centralSize, 12); end.writeUInt32LE(offset, 16);
  const all = Buffer.concat([...locals, ...centrals, end]);
  return all.buffer.slice(all.byteOffset, all.byteOffset + all.byteLength) as ArrayBuffer;
}

describe("review invitation import", () => {
  it("reads CSV with quotes, commas and Windows line endings", () => {
    expect(parseCsv('Name,Email\r\n"Lee, Ana",ana@example.com\r\nBo "B" Ray,bo@example.com\r\n')).toEqual([["Name", "Email"], ["Lee, Ana", "ana@example.com"], ['Bo "B" Ray', "bo@example.com"]]);
    expect(parseCsv("name;email\nSam;sam@example.com")).toEqual([["name", "email"], ["Sam", "sam@example.com"]]);
  });

  it("finds name and email columns by header and checks every row", () => {
    const result = toInvitationRows([["Customer Name", "Phone", "E-mail"], ["Ana Lee", "555", "ANA@Example.com "], ["Bo Ray", "", "not-an-email"], ["", "", "x@example.com"], ["Ana again", "", "ana@example.com"]]);
    expect(result.rows.map((row) => [row.line, row.status, row.email])).toEqual([[2, "ready", "ana@example.com"], [3, "invalid", "not-an-email"], [4, "invalid", "x@example.com"], [5, "duplicate", "ana@example.com"]]);
    expect(result.ready).toBe(1);
    expect(result.rows[2].reason).toBe("Missing name");
  });

  it("joins First and Last name columns, and works without a header row", () => {
    expect(toInvitationRows([["First Name", "Last Name", "Email"], ["Ana", "Lee", "ana@example.com"]]).rows[0]).toMatchObject({ name: "Ana Lee", status: "ready" });
    expect(toInvitationRows([["Ana Lee", "ana@example.com"], ["Bo Ray", "bo@example.com"]]).ready).toBe(2);
  });

  it("explains when there is no email column", () => {
    expect(toInvitationRows([["Name", "Phone"], ["Ana", "555"]]).error).toMatch(/email column/i);
  });

  it("reads the first sheet of a real Excel workbook, including shared and inline text", async () => {
    const xlsx = makeXlsx({
      "xl/workbook.xml": '<workbook xmlns:r="r"><sheets><sheet name="Buyers" sheetId="1" r:id="rId1"/></sheets></workbook>',
      "xl/_rels/workbook.xml.rels": '<Relationships><Relationship Id="rId1" Type="worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
      "xl/sharedStrings.xml": "<sst><si><t>Name</t></si><si><t>Email</t></si><si><r><t>Ana </t></r><r><t>Lee</t></r></si><si><t>ana@example.com</t></si></sst>",
      "xl/worksheets/sheet1.xml": '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1" t="s"><v>1</v></c></row><row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2"><v>42</v></c><c r="C2" t="s"><v>3</v></c></row><row r="3"><c r="A3" t="inlineStr"><is><t>Bo &amp; Co</t></is></c><c r="C3" t="inlineStr"><is><t>bo@example.com</t></is></c></row></sheetData></worksheet>'
    });
    const table = await parseXlsx(xlsx);
    expect(table).toEqual([["Name", "", "Email"], ["Ana Lee", "42", "ana@example.com"], ["Bo & Co", "", "bo@example.com"]]);
    expect(toInvitationRows(table).ready).toBe(2);
  });
});
