import type { UploadedLogo } from "./product-setup-types";
export async function uploadLogoAsset(file: File, productSlug: string): Promise<UploadedLogo> {
  const form = new FormData();
  form.set("file", file);
  form.set("productSlug", productSlug);

  const response = await fetch("/api/setup/logo-upload", {
    method: "POST",
    body: form
  });
  const body = await response.json().catch(() => ({}));

  if (!response.ok || !body.asset?.mediaUrl || !body.asset?.storageKey) {
    throw new Error(body.error ?? "Logo upload failed. Use a PNG, JPG, or WEBP image up to 10 MB.");
  }

  return {
    mediaUrl: body.asset.mediaUrl,
    storageKey: body.asset.storageKey,
    filename: body.asset.filename ?? file.name
  };
}

export async function prepareLogoUpload(file: File): Promise<{ file: File; trimApplied: boolean; blankMarginPercent: number }> {
  const image = await loadLogoImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context || canvas.width < 2 || canvas.height < 2) {
    return { file, trimApplied: false, blankMarginPercent: 0 };
  }

  context.drawImage(image, 0, 0);
  const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const index = (y * canvas.width + x) * 4;
      if (isLogoContentPixel(data[index], data[index + 1], data[index + 2], data[index + 3])) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return { file, trimApplied: false, blankMarginPercent: 0 };
  }

  const contentWidth = maxX - minX + 1;
  const contentHeight = maxY - minY + 1;
  const contentAreaRatio = (contentWidth * contentHeight) / (canvas.width * canvas.height);
  const blankMarginPercent = Math.round((1 - contentAreaRatio) * 100);

  const shouldCrop = blankMarginPercent >= 12;
  const padding = shouldCrop ? Math.round(Math.max(contentWidth, contentHeight) * 0.04) : 0;
  const cropX = shouldCrop ? Math.max(0, minX - padding) : 0;
  const cropY = shouldCrop ? Math.max(0, minY - padding) : 0;
  const cropWidth = shouldCrop ? Math.min(canvas.width - cropX, contentWidth + padding * 2) : canvas.width;
  const cropHeight = shouldCrop ? Math.min(canvas.height - cropY, contentHeight + padding * 2) : canvas.height;
  const output = document.createElement("canvas");
  output.width = cropWidth;
  output.height = cropHeight;
  const outputContext = output.getContext("2d");

  if (!outputContext) {
    return { file, trimApplied: false, blankMarginPercent };
  }

  outputContext.drawImage(canvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
  const backgroundRemoved = removeEdgeConnectedWhiteBackground(outputContext, cropWidth, cropHeight);

  if (!shouldCrop && !backgroundRemoved) {
    return { file, trimApplied: false, blankMarginPercent };
  }

  const blob = await new Promise<Blob | null>((resolve) => output.toBlob(resolve, "image/png"));

  if (!blob) {
    return { file, trimApplied: false, blankMarginPercent };
  }

  const filename = `${file.name.replace(/\.[^.]+$/, "") || "logo"}-trimmed.png`;
  return { file: new File([blob], filename, { type: "image/png" }), trimApplied: shouldCrop || backgroundRemoved, blankMarginPercent };
}

function removeEdgeConnectedWhiteBackground(context: CanvasRenderingContext2D, width: number, height: number) {
  const imageData = context.getImageData(0, 0, width, height);
  const data = imageData.data;
  const visited = new Uint8Array(width * height);
  const queue: number[] = [];
  let cursor = 0;
  let changed = false;

  function enqueue(x: number, y: number) {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const point = y * width + x;
    if (visited[point]) return;
    const index = point * 4;
    if (!isRemovableWhitePixel(data[index], data[index + 1], data[index + 2], data[index + 3])) return;
    visited[point] = 1;
    queue.push(point);
  }

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  while (cursor < queue.length) {
    const point = queue[cursor]!;
    cursor += 1;
    const x = point % width;
    const y = Math.floor(point / width);
    const index = point * 4;
    data[index + 3] = 0;
    changed = true;
    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  if (changed) {
    context.putImageData(imageData, 0, 0);
  }

  return changed;
}

function isRemovableWhitePixel(red: number, green: number, blue: number, alpha: number) {
  return alpha > 16 && red >= 242 && green >= 242 && blue >= 242;
}

function loadLogoImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Logo image could not be prepared."));
    };
    image.src = objectUrl;
  });
}

function isLogoContentPixel(red: number, green: number, blue: number, alpha: number) {
  if (alpha < 16) return false;
  return !(red >= 245 && green >= 245 && blue >= 245);
}


