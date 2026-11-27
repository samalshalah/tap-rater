import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

// Keep the approved artwork at its original dimensions. WebP lossless preserves
// all visible RGB values and alpha; RGB under fully transparent pixels is unused.
for (const name of ["custom-google-hero-cutout", "nfc-notification-white", "google-review-phone"]) {
  const source = await readFile(`public/assets/${name}.png`);
  const encoded = await sharp(source).webp({ lossless: true, effort: 6 }).toBuffer();
  const before = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const after = await sharp(encoded).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.deepEqual(after.info, before.info, `${name}: dimensions must remain unchanged`);
  for (let i = 0; i < before.data.length; i += 4) {
    assert.equal(after.data[i + 3], before.data[i + 3], `${name}: alpha must remain unchanged`);
    if (before.data[i + 3] > 0) {
      for (let channel = 0; channel < 3; channel++) {
        assert.equal(after.data[i + channel], before.data[i + channel], `${name}: visible pixels must remain unchanged`);
      }
    }
  }
  assert(encoded.length < source.length, `${name}: optimized image must be smaller`);
  await writeFile(`public/assets/${name}.webp`, encoded);
  console.log(`${name}: ${source.length} -> ${encoded.length} bytes; visible pixels and alpha identical`);
}

// This is the exact logo used by the live header. Other legacy logo source files
// contain placeholders, so derive favicon exports from this verified brand asset.
const logo = await readFile("public/uploads-optimized/brand/tap-rater-logo-w160.webp");
const squareLogo = async (size) => {
  const { data, info } = await sharp(logo)
    .resize({ width: size, height: size, fit: "inside", withoutEnlargement: true })
    .toBuffer({ resolveWithObject: true });
  const horizontal = size - info.width;
  const vertical = size - info.height;
  return sharp(data).extend({
    left: Math.floor(horizontal / 2), right: Math.ceil(horizontal / 2),
    top: Math.floor(vertical / 2), bottom: Math.ceil(vertical / 2),
    background: { r: 255, g: 255, b: 255, alpha: 0 }
  }).png({ compressionLevel: 9 }).toBuffer();
};

await writeFile("public/favicon.png", await squareLogo(96));
await writeFile("public/apple-touch-icon.png", await squareLogo(180));

// ICO supports PNG image entries; include common browser display sizes.
const sizes = [16, 32, 48, 64];
const entries = await Promise.all(sizes.map(squareLogo));
const header = Buffer.alloc(6 + entries.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(entries.length, 4);
let offset = header.length;
entries.forEach((entry, index) => {
  const position = 6 + index * 16;
  header[position] = sizes[index];
  header[position + 1] = sizes[index];
  header.writeUInt16LE(1, position + 4);
  header.writeUInt16LE(32, position + 6);
  header.writeUInt32LE(entry.length, position + 8);
  header.writeUInt32LE(offset, position + 12);
  offset += entry.length;
});
await writeFile("public/favicon.ico", Buffer.concat([header, ...entries]));
console.log("Generated square favicon PNG, multi-size ICO, and Apple touch icon from the existing Tap Rater logo.");
