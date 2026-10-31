import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { optimizedUploadSrc } from './optimized-upload';

// Only the display payload is changed. Approval hashes and print assets stay original.
export async function lightweightProofSvg(svg: string, templateUrl?: string) {
  if (!templateUrl || !/^\/uploads\/products\/[a-zA-Z0-9_./-]+\.(png|jpe?g|webp)$/.test(templateUrl) || templateUrl.includes('..')) return svg;
  try {
    const path = optimizedUploadSrc(templateUrl, 1200);
    let bytes: Uint8Array;
    if (process.env.NODE_ENV !== 'production') bytes = await readFile(join(process.cwd(), 'public', path));
    else {
      const { env } = await getCloudflareContext({ async: true });
      if (!env.ASSETS) return svg;
      const response = await env.ASSETS.fetch(new URL(path, 'https://taprater.com').toString());
      if (!response.ok) return svg;
      bytes = new Uint8Array(await response.arrayBuffer());
    }
    const displayUri = `data:image/webp;base64,${Buffer.from(bytes).toString('base64')}`;
    return svg.replace(/(<image href=")data:image\/[^" ]+(" width=)/, `$1${displayUri}$2`);
  } catch { return svg; } // A missing display variant must not block ordering.
}

export function packProofPreview(svg: string, knownAssets: unknown) {
  const known = new Set(Array.isArray(knownAssets) ? knownAssets.filter((value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)).slice(0, 4) : []);
  const assets: Record<string, string> = {};
  const assetIds: string[] = [];
  const packedSvg = svg.replace(/href="(data:image\/[^" ]+)"/g, (_, uri: string) => {
    const id = createHash('sha256').update(uri).digest('hex');
    assetIds.push(id);
    if (!known.has(id)) assets[id] = uri;
    return `href="proof-asset:${id}"`;
  });
  return { svg: packedSvg, assets, assetIds };
}
