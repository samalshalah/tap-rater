import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// Vendor the licensed font as data so the Worker never depends on a font CDN.
const root = new URL('../src/data/print-font/', import.meta.url);
await mkdir(root, { recursive: true });
const source = 'https://raw.githubusercontent.com/notofonts/noto-fonts/main/';
const response = await fetch(`${source}hinted/ttf/NotoSans/NotoSans-Bold.ttf`);
if (!response.ok) throw new Error(`Font download failed: ${response.status}`);
const bytes = Buffer.from(await response.arrayBuffer());
if (bytes.readUInt32BE(0) !== 0x00010000) throw new Error('Expected a TrueType font.');
const license = await fetch(`${source}LICENSE`);
if (!license.ok) throw new Error('Font license download failed.');
await writeFile(new URL('OFL.txt', root), await license.text());
await writeFile(new URL('noto-sans-bold.json', root), JSON.stringify({
  source: `${source}hinted/ttf/NotoSans/NotoSans-Bold.ttf`,
  sha256: createHash('sha256').update(bytes).digest('hex'),
  base64: bytes.toString('base64')
}) + '\n');
