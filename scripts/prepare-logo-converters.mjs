import { copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const packages = {
  "@imagemagick/magick-wasm": {
    "dist/index.js": "magick.mjs", "dist/x86/magick.wasm": "magick.wasm",
    "LICENSE": "magick-license.txt", "NOTICE": "magick-notice.txt"
  },
  "@jspawn/ghostscript-wasm": {
    "gs.js": "gs.js", "gs.mjs": "gs.mjs", "browser.js": "browser.js", "gs.wasm": "gs.wasm",
    "LICENSE": "ghostscript-license.txt"
  },
  "heic-to": { "dist/csp/heic-to.min.js": "heic.mjs", "LICENSE": "heic-license.txt" }
};
const out = "public/logo-converter/vendor";
await mkdir(out, { recursive: true });
for (const [pkg, files] of Object.entries(packages)) {
  for (const [source, dest] of Object.entries(files)) {
    await copyFile(join("node_modules",pkg,source),join(out,dest));
  }
}
