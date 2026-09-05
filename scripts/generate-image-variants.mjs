import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";
import sharp from "sharp";

const sourceRoot = resolve("public/uploads");
const outputRoot = resolve("public/uploads-optimized");
const manifestPath = join(outputRoot, "manifest.json");
const widths = [160, 640, 1200];
const checkOnly = process.argv.includes("--check");

const files = (await findImages(sourceRoot)).sort();
const previousManifest = await readManifest();
const sources = {};

for (const file of files) {
  const source = await readFile(file);
  const sourcePath = normalizePath(relative(sourceRoot, file));
  const digest = createHash("sha256").update(source).digest("hex");
  sources[sourcePath] = digest;

  for (const width of widths) {
    const outputPath = variantPath(sourcePath, width);
    const absoluteOutputPath = join(outputRoot, outputPath);

    if (checkOnly) {
      await stat(absoluteOutputPath).catch(() => {
        throw new Error(`Missing generated image variant: ${normalizePath(relative(process.cwd(), absoluteOutputPath))}`);
      });
      continue;
    }

    if (previousManifest?.sources?.[sourcePath] === digest && await fileExists(absoluteOutputPath)) {
      continue;
    }

    await mkdir(dirname(absoluteOutputPath), { recursive: true });
    await sharp(source)
      .rotate()
      .resize({ width, height: width, fit: "inside", withoutEnlargement: true })
      .webp({ quality: width === 1200 ? 86 : 82, effort: 4 })
      .toFile(absoluteOutputPath);
  }
}

const manifest = { version: 1, widths, sources };
if (checkOnly) {
  if (!previousManifest || JSON.stringify(previousManifest) !== JSON.stringify(manifest)) {
    throw new Error("Generated image manifest is stale. Run npm run images:generate.");
  }
  console.log(`Verified ${files.length * widths.length} generated image variants.`);
} else {
  await mkdir(outputRoot, { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`Generated ${files.length * widths.length} image variants.`);
}

async function findImages(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      paths.push(...await findImages(path));
    } else if ([".jpg", ".jpeg", ".png", ".webp"].includes(extname(entry.name).toLowerCase())) {
      paths.push(path);
    }
  }

  return paths;
}

function variantPath(sourcePath, width) {
  const extension = extname(sourcePath);
  return `${sourcePath.slice(0, -extension.length)}-w${width}.webp`;
}

function normalizePath(path) {
  return path.replaceAll("\\", "/");
}

async function readManifest() {
  try {
    return JSON.parse(await readFile(manifestPath, "utf8"));
  } catch {
    return null;
  }
}

async function fileExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}
