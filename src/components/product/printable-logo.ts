import { openLogoImage } from "./logo-image";

const megabyte = 1024 * 1024;
const renderError = "We couldn't render this artwork. For a locked or proprietary file, save a PDF or PNG copy and choose it here.";

function renderDesignFile(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const worker = new Worker("/logo-converter/worker.js", {type: "module"});
    const fail = () => {
      clearTimeout(timer);
      worker.terminate();
      reject(new Error(renderError));
    };
    const timer = window.setTimeout(fail, 90_000);
    worker.onerror = fail;
    worker.onmessage = ({data}) => {
      if (!(data.blob instanceof Blob) || !data.blob.size) return fail();
      clearTimeout(timer);
      worker.terminate();
      resolve(data.blob);
    };
    worker.postMessage({file});
  });
}

export async function printableLogo(file: File): Promise<File> {
  if (!file.size) throw new Error("This file is empty. Choose a logo with artwork.");
  if (file.size > 50 * megabyte) throw new Error("Choose a logo smaller than 50 MB.");
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const ascii = String.fromCharCode(...header);
  const alreadyPrintable = ascii.startsWith("\x89PNG\r\n\x1a\n") || (header[0] === 255 && header[1] === 216)
    || (ascii.startsWith("RIFF") && ascii.slice(8) === "WEBP");
  const vector = file.type === "image/svg+xml" || /\.svg$/i.test(file.name);
  const source = vector ? file.slice(0,file.size,"image/svg+xml") : file;
  let image: HTMLImageElement;
  try {
    image = await openLogoImage(source);
  } catch {
    image = await openLogoImage(await renderDesignFile(file));
  }

  const width = image.naturalWidth, height = image.naturalHeight;
  if (!width || !height) throw new Error(renderError);
  if (alreadyPrintable && file.size <= 10 * megabyte && Math.min(width,height) >= 64 && Math.max(width,height) <= 12000) return file;
  // Rasterize vector paths at print resolution. Preserve the aspect ratio and pad narrow artwork.
  let scale = Math.min(vector ? Infinity : 1, 2400 / Math.max(width,height));
  for (let attempt = 0; attempt < 3; attempt++) {
    const w = Math.max(1,Math.round(width*scale)), h = Math.max(1,Math.round(height*scale));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(64,w);
    canvas.height = Math.max(64,h);
    const context = canvas.getContext("2d");
    if (!context) throw new Error(renderError);
    context.drawImage(image,(canvas.width-w)/2,(canvas.height-h)/2,w,h);
    const blob = await new Promise<Blob|null>(resolve => canvas.toBlob(resolve,"image/png"));
    canvas.width = canvas.height = 1;
    if (blob && blob.size <= 10*megabyte) {
      return new File([blob], (file.name.replace(/\.[^.]+$/, "") || "logo") + ".png", {type:"image/png"});
    }
    scale *= 0.65;
  }
  throw new Error("This artwork is too large to preview. Choose a smaller copy.");
}
