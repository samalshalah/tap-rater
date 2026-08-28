import { getCloudflareContext } from "@opennextjs/cloudflare";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

export type ProductMediaRole =
  | "main"
  | "gallery"
  | "standard_angled"
  | "standard_front"
  | "branded_angled"
  | "branded_front_template"
  | "multilink_angled"
  | "multilink_front_template"
  | "center_asset";

type ProductMediaBucket = {
  put: (
    key: string,
    value: ArrayBuffer,
    options?: {
      httpMetadata?: {
        contentType?: string;
        cacheControl?: string;
      };
      customMetadata?: Record<string, string>;
    }
  ) => Promise<unknown>;
  get: (key: string) => Promise<{
    body?: ReadableStream;
    arrayBuffer?: () => Promise<ArrayBuffer>;
    httpMetadata?: {
      contentType?: string;
      cacheControl?: string;
    };
    writeHttpMetadata?: (headers: Headers) => void;
  } | null>;
};

export type UploadedProductMedia = {
  url: string;
  storageKey: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
};

const productMediaBucketBinding = "PRODUCT_MEDIA_BUCKET";
const maxProductMediaUploadBytes = 10 * 1024 * 1024;
const maxProductMediaDimensionPixels = 12000;
const minProductMediaDimensionPixels = 64;
const allowedImageTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

export class ProductMediaStorageError extends Error {
  constructor(
    message: string,
    public readonly status = 400
  ) {
    super(message);
  }
}

export async function getProductMediaBucket() {
  const localBucket = getLocalProductMediaBucket();
  if (localBucket) return localBucket;

  try {
    const context = await getCloudflareContext({ async: true });
    const env = context.env as CloudflareEnv & { PRODUCT_MEDIA_BUCKET?: ProductMediaBucket };
    return env[productMediaBucketBinding];
  } catch {
    return undefined;
  }
}

function getLocalProductMediaBucket(): ProductMediaBucket | undefined {
  if (process.env.NODE_ENV === "production") return undefined;

  const root = process.env.TAP_RATER_LOCAL_PRODUCT_MEDIA_DIR?.trim();
  if (!root) return undefined;

  const absoluteRoot = resolve(root);

  return {
    async put(key, value, options) {
      assertLocalMediaKey(key);
      const filePath = localMediaPath(absoluteRoot, key);
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, Buffer.from(value));
      await writeFile(`${filePath}.metadata.json`, JSON.stringify(options?.httpMetadata ?? {}, null, 2), "utf8");
    },
    async get(key) {
      assertLocalMediaKey(key);
      const filePath = localMediaPath(absoluteRoot, key);

      try {
        const buffer = await readFile(filePath);
        const metadata = await readLocalMediaMetadata(filePath);
        const bytes = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

        return {
          arrayBuffer: async () => bytes,
          httpMetadata: metadata,
          writeHttpMetadata(headers: Headers) {
            if (metadata.contentType) headers.set("Content-Type", metadata.contentType);
            if (metadata.cacheControl) headers.set("Cache-Control", metadata.cacheControl);
          }
        };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw error;
      }
    }
  };
}

async function readLocalMediaMetadata(filePath: string) {
  try {
    const parsed = JSON.parse(await readFile(`${filePath}.metadata.json`, "utf8"));
    return {
      contentType: typeof parsed.contentType === "string" ? parsed.contentType : undefined,
      cacheControl: typeof parsed.cacheControl === "string" ? parsed.cacheControl : undefined
    };
  } catch {
    return {};
  }
}

function localMediaPath(root: string, key: string) {
  return join(root, ...key.split("/"));
}

function assertLocalMediaKey(key: string) {
  if (!isSafeProductMediaKey(key)) {
    throw new ProductMediaStorageError("Invalid media key.", 400);
  }
}

export function isSafeProductMediaKey(key: string) {
  return key.startsWith("products/") && !key.includes("..") && !key.includes("\\");
}

export async function getProductMediaObject(key: string) {
  if (!isSafeProductMediaKey(key)) {
    throw new ProductMediaStorageError("Invalid media key.", 400);
  }

  const bucket = await getProductMediaBucket();
  if (!bucket) {
    throw new ProductMediaStorageError("Product media storage is not configured.", 503);
  }

  return bucket.get(key);
}

export async function uploadProductMedia({
  file,
  productSlug,
  role
}: {
  file: File;
  productSlug: string;
  role: ProductMediaRole;
}): Promise<UploadedProductMedia> {
  if (!file || file.size <= 0) {
    throw new ProductMediaStorageError("Choose an image file to upload.", 400);
  }

  if (file.size > maxProductMediaUploadBytes) {
    throw new ProductMediaStorageError("Image must be 10 MB or smaller.", 400);
  }

  if (!allowedImageTypes.has(file.type)) {
    throw new ProductMediaStorageError("Only PNG, JPG, and WEBP images are supported for uploads.", 400);
  }

  const bytes = await file.arrayBuffer();
  const dimensions = readImageDimensions(bytes, file.type);

  if (!dimensions) {
    throw new ProductMediaStorageError("Image dimensions could not be validated.", 400);
  }

  if (dimensions.width < minProductMediaDimensionPixels || dimensions.height < minProductMediaDimensionPixels) {
    throw new ProductMediaStorageError("Image must be at least 64 by 64 pixels.", 400);
  }

  if (dimensions.width > maxProductMediaDimensionPixels || dimensions.height > maxProductMediaDimensionPixels) {
    throw new ProductMediaStorageError("Image dimensions are too large.", 400);
  }

  if (role === "center_asset" && isLikelyFullStandArtworkUpload(dimensions)) {
    throw new ProductMediaStorageError("Upload the customer logo only, not a full stand proof or template image.", 400);
  }

  const bucket = await getProductMediaBucket();
  if (!bucket) {
    throw new ProductMediaStorageError("Product media storage is not configured.", 503);
  }

  const safeProductSlug = slugSegment(productSlug || "draft-product");
  const safeFilename = fileNameSegment(file.name || "product-image");
  const storageKey = `products/${safeProductSlug}/${role}/${Date.now()}-${crypto.randomUUID()}-${safeFilename}`;

  await bucket.put(storageKey, bytes, {
    httpMetadata: {
      contentType: file.type,
      cacheControl: "public, max-age=31536000, immutable"
    },
    customMetadata: {
      role,
      originalFilename: safeFilename
    }
  });

  return {
    url: getProductMediaUrl(storageKey),
    storageKey,
    filename: safeFilename,
    contentType: file.type,
    sizeBytes: file.size,
    width: dimensions.width,
    height: dimensions.height
  };
}

export function getProductMediaUrl(storageKey: string) {
  const publicBaseUrl = process.env.PRODUCT_MEDIA_PUBLIC_BASE_URL?.replace(/\/+$/, "");

  if (publicBaseUrl) {
    return `${publicBaseUrl}/${storageKey}`;
  }

  return `/api/media/product/${storageKey}`;
}

export function isLikelyFullStandArtworkUpload({ width, height }: { width: number; height: number }) {
  const aspectRatio = width / height;
  const pixelCount = width * height;
  return height > width && pixelCount >= 1_000_000 && aspectRatio >= 0.58 && aspectRatio <= 0.78;
}

function slugSegment(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 90) || "draft-product"
  );
}

function fileNameSegment(value: string) {
  const cleaned = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-|-$/g, "");

  return cleaned.slice(0, 120) || "product-image";
}

function readImageDimensions(bytes: ArrayBuffer, contentType: string) {
  if (contentType === "image/png") {
    return readPngDimensions(bytes);
  }

  if (contentType === "image/jpeg") {
    return readJpegDimensions(bytes);
  }

  if (contentType === "image/webp") {
    return readWebpDimensions(bytes);
  }

  return null;
}

function readPngDimensions(bytes: ArrayBuffer) {
  if (bytes.byteLength < 24) return null;
  const view = new DataView(bytes);
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (!signature.every((byte, index) => view.getUint8(index) === byte)) return null;

  return {
    width: view.getUint32(16),
    height: view.getUint32(20)
  };
}

function readJpegDimensions(bytes: ArrayBuffer) {
  if (bytes.byteLength < 4) return null;
  const view = new DataView(bytes);
  if (view.getUint8(0) !== 0xff || view.getUint8(1) !== 0xd8) return null;

  let offset = 2;
  while (offset < view.byteLength) {
    if (view.getUint8(offset) !== 0xff) return null;
    const marker = view.getUint8(offset + 1);
    offset += 2;

    if (marker === 0xd8 || marker === 0xd9) continue;
    if (offset + 2 > view.byteLength) return null;

    const length = view.getUint16(offset);
    if (length < 2 || offset + length > view.byteLength) return null;

    const isStartOfFrame =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);

    if (isStartOfFrame) {
      if (offset + 7 > view.byteLength) return null;
      return {
        height: view.getUint16(offset + 3),
        width: view.getUint16(offset + 5)
      };
    }

    offset += length;
  }

  return null;
}

function readWebpDimensions(bytes: ArrayBuffer) {
  if (bytes.byteLength < 30) return null;
  const view = new DataView(bytes);
  if (readAscii(view, 0, 4) !== "RIFF" || readAscii(view, 8, 4) !== "WEBP") return null;

  const chunkType = readAscii(view, 12, 4);

  if (chunkType === "VP8X" && bytes.byteLength >= 30) {
    return {
      width: readUint24LittleEndian(view, 24) + 1,
      height: readUint24LittleEndian(view, 27) + 1
    };
  }

  if (chunkType === "VP8L" && bytes.byteLength >= 25 && view.getUint8(20) === 0x2f) {
    const bits = view.getUint32(21, true);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1
    };
  }

  if (chunkType === "VP8 " && bytes.byteLength >= 30) {
    const frameStart = 20;
    if (view.getUint8(frameStart + 3) !== 0x9d || view.getUint8(frameStart + 4) !== 0x01 || view.getUint8(frameStart + 5) !== 0x2a) {
      return null;
    }
    return {
      width: view.getUint16(frameStart + 6, true) & 0x3fff,
      height: view.getUint16(frameStart + 8, true) & 0x3fff
    };
  }

  return null;
}

function readAscii(view: DataView, offset: number, length: number) {
  return Array.from({ length }, (_, index) => String.fromCharCode(view.getUint8(offset + index))).join("");
}

function readUint24LittleEndian(view: DataView, offset: number) {
  return view.getUint8(offset) + (view.getUint8(offset + 1) << 8) + (view.getUint8(offset + 2) << 16);
}
