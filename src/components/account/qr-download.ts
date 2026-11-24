// Saves a QR code (SVG text) as an SVG file and a 1024px PNG for print and production.
function save(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

export async function downloadQrFiles(svg: string, baseName: string) {
  const svgBlob = new Blob([svg], { type: "image/svg+xml" });
  save(svgBlob, `${baseName}.svg`);

  const image = new Image();
  const svgUrl = URL.createObjectURL(svgBlob);
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("QR image could not be drawn."));
      image.src = svgUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, 1024, 1024);
    context.drawImage(image, 0, 0, 1024, 1024);
    const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (png) save(png, `${baseName}.png`);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}
