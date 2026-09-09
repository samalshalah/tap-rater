export async function fetchOrderFile(url: string, fallbackName: string) {
  const response = await fetch(url, { cache: "no-store", credentials: "same-origin", signal: AbortSignal.timeout(30000) });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(response.status === 401 ? "Sign in to admin again, then retry the download."
      : typeof body?.error === "string" ? body.error : "The file could not be downloaded. Please try again.");
  }
  const contentType = response.headers.get("content-type")?.split(";")[0].trim();
  if (!["image/svg+xml", "image/png", "image/jpeg", "image/webp", "text/plain"].includes(contentType ?? "")) {
    throw new Error("The server did not return a design file. Refresh the order and try again.");
  }
  const blob = await response.blob();
  if (!blob.size) throw new Error("The design file is empty. Please try again.");
  const filename = response.headers.get("content-disposition")?.match(/filename="([^"\r\n]+)"/i)?.[1];
  return { blob, filename: filename && !/[\\/]/.test(filename) ? filename : fallbackName };
}

export function saveOrderFile(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Keep the object URL alive long enough for browsers to begin saving the file.
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
}
