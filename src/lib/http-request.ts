export class RequestBodyTooLargeError extends Error {
  constructor(public readonly maxBytes: number) {
    super(`Request body exceeds ${maxBytes} bytes.`);
  }
}

export function requestContentLengthExceeds(request: Request, maxBytes: number) {
  const value = request.headers.get("content-length")?.trim();
  if (!value || !/^\d+$/.test(value)) return false;

  return Number(value) > maxBytes;
}

export async function readRequestTextWithLimit(request: Request, maxBytes: number) {
  if (requestContentLengthExceeds(request, maxBytes)) {
    throw new RequestBodyTooLargeError(maxBytes);
  }

  if (!request.body) return "";

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new RequestBodyTooLargeError(maxBytes);
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(body);
}
