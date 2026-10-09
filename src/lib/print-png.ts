// PNG pHYs stores pixels per metre, not DPI. 300 / 0.0254 = 11811.
export function withPrintResolution(png: Uint8Array): Uint8Array<ArrayBuffer> {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  if (png.length < 33 || view.getUint32(0) !== 0x89504e47 || view.getUint32(4) !== 0x0d0a1a0a) throw new Error("Invalid PNG image.");
  const chunk = new Uint8Array(21);
  const data = new DataView(chunk.buffer);
  data.setUint32(0, 9);
  chunk.set([112, 72, 89, 115], 4);
  data.setUint32(8, 11811); data.setUint32(12, 11811); chunk[16] = 1;
  let crc = 0xffffffff;
  for (const byte of chunk.subarray(4, 17)) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  data.setUint32(17, (crc ^ 0xffffffff) >>> 0);
  const parts: Uint8Array[] = [png.subarray(0, 8)];
  let offset = 8;
  while (offset < png.length) {
    if (offset + 12 > png.length) throw new Error("Incomplete PNG image.");
    const length = view.getUint32(offset);
    const end = offset + length + 12;
    if (end > png.length) throw new Error("Incomplete PNG image.");
    const type = view.getUint32(offset + 4);
    // Remove old resolution and EXIF metadata so readers cannot prefer stale DPI.
    if (type !== 0x70485973 && type !== 0x65584966) parts.push(png.subarray(offset, end));
    if (type === 0x49484452) parts.push(chunk);
    offset = end;
  }
  const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let position = 0;
  for (const part of parts) { result.set(part, position); position += part.length; }
  return result;
}

export async function createPrintPng(source: Blob): Promise<Blob> {
  // Existing raster designs retain every original pixel; only print metadata changes.
  if (source.type.split(";")[0] === "image/png") {
    return new Blob([withPrintResolution(new Uint8Array(await source.arrayBuffer()))], { type: "image/png" });
  }
  let width: number | undefined;
  let height: number | undefined;
  if (source.type.split(";")[0] === "image/svg+xml") {
    const svg = new DOMParser().parseFromString(await source.text(), "image/svg+xml").documentElement;
    const dimensions = svg.getAttribute("viewBox")?.trim().split(/[\s,]+/).map(Number);
    if (svg.localName !== "svg" || !dimensions || dimensions.length !== 4) throw new Error("Artwork dimensions are missing.");
    [width, height] = dimensions.slice(2);
    if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0 || width * height > 40000000) throw new Error("Artwork dimensions are invalid.");
    // The production SVG viewBox is the approved pixel grid at 300 DPI.
    svg.setAttribute("width", String(width)); svg.setAttribute("height", String(height));
    source = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" });
  }
  const url = URL.createObjectURL(source);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = width ?? image.naturalWidth; canvas.height = height ?? image.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image export is unavailable in this browser.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const png = await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("PNG export failed.")), "image/png"));
    return new Blob([withPrintResolution(new Uint8Array(await png.arrayBuffer()))], { type: "image/png" });
  } finally { URL.revokeObjectURL(url); }
}
