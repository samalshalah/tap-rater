import { randomUUID } from "node:crypto";
import { getProductMediaBucket, inspectUploadedImage } from "@/lib/admin-media-storage";
import { ProductReviewError } from "@/lib/product-reviews";

export const maxReviewPhotoBytes = 4 * 1024 * 1024;
// Browser canvas converts camera/gallery images to JPEG. Strip metadata again on the
// server, so direct requests cannot retain GPS, camera identifiers, or comments.
export function sanitizeReviewPhoto(bytes: ArrayBuffer) {
  const image = inspectUploadedImage(bytes);
  if (bytes.byteLength > maxReviewPhotoBytes || !image || image.contentType !== "image/jpeg" ||
      Math.max(image.dimensions.width, image.dimensions.height) > 2400 ||
      Math.min(image.dimensions.width, image.dimensions.height) < 64) {
    throw new ProductReviewError("Choose a clear stand photo. Please remove it and try uploading it again.");
  }
  const b = new Uint8Array(bytes);
  const chunks: Uint8Array[] = [b.slice(0, 2)];
  let offset = 2;
  let sawScan = false; let sawEnd = false;
  while (offset + 1 < b.length) {
    if (b[offset] !== 0xff) throw new ProductReviewError("The photo is not a valid JPEG.");
    const marker = b[offset + 1];
    if (marker === 0xd9) { sawEnd = true; chunks.push(b.slice(offset, offset + 2)); break; }
    const length = (b[offset + 2] << 8) + b[offset + 3];
    if (length < 2 || offset + 2 + length > b.length) throw new ProductReviewError("The photo is incomplete.");
    if (!(marker >= 0xe1 && marker <= 0xef) && marker !== 0xfe) chunks.push(b.slice(offset, offset + 2 + length));
    offset += length + 2;
    if (marker === 0xda) {
      sawScan = true;
      const scanStart = offset;
      while (offset + 1 < b.length) {
        if (b[offset] !== 0xff) { offset++; continue; }
        if (b[offset + 1] === 0 || (b[offset + 1] >= 0xd0 && b[offset + 1] <= 0xd7)) { offset += 2; continue; }
        break;
      }
      chunks.push(b.slice(scanStart, offset));
    }
  }
  if (!sawScan || !sawEnd) throw new ProductReviewError("The photo is incomplete.");
  const size = chunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Uint8Array(size);
  let start = 0;
  for (const chunk of chunks) { result.set(chunk, start); start += chunk.length; }
  return result.buffer;
}
export async function saveReviewPhoto(id: string, file: File) {
  const bytes = sanitizeReviewPhoto(await file.arrayBuffer());
  const bucket = await getProductMediaBucket();
  if (!bucket) throw new ProductReviewError("Photo upload is temporarily unavailable. Try again, or submit without a photo.", 503);
  // Outside products/: the public product-media endpoint cannot read private reviews.
  const key = `product-reviews/${id}/${randomUUID()}.jpg`;
  await bucket.put(key, bytes, { httpMetadata: { contentType: "image/jpeg", cacheControl: "private, no-store" } });
  return key;
}
