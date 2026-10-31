import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { lightweightProofSvg, packProofPreview } from '@/lib/proof-preview-transfer';
import { migratedProducts } from '@/data/migrated-products';

describe('lightweight display proofs', () => {
  it('reuses images across edits and transfers a changed logo without trusting client data', () => {
    const svg = '<svg><image href="data:image/png;base64,YmFzZQ=="/><image href="data:image/png;base64,bG9nbw=="/><path d="M1 2"/></svg>';
    const first = packProofPreview(svg, []);
    const next = packProofPreview(svg.replace('M1 2', 'M3 4'), first.assetIds);
    expect(Object.keys(first.assets)).toHaveLength(2);
    expect(next.assets).toEqual({});
    expect(next.svg.replace(/proof-asset:([a-f0-9]{64})/g, (_, id) => first.assets[id])).toBe(svg.replace('M1 2', 'M3 4'));
    const changed = packProofPreview(svg.replace('bG9nbw==', 'bmV3'), first.assetIds);
    expect(Object.keys(changed.assets)).toHaveLength(1);
  });
  it('uses a smaller display template without changing logo, text or QR geometry', async () => {
    const path = migratedProducts.find(p => p.slug === 'google-review-stand')!.assetSet!.brandedFrontTemplateUrl!;
    const bytes = await readFile(`public${path}`);
    const svg = `<svg><image href="data:image/png;base64,${bytes.toString('base64')}" width="1278"/><image href="data:image/png;base64,bG9nbw=="/><path d="M1 2"/></svg>`;
    const display = await lightweightProofSvg(svg, path);
    expect(display).toContain('data:image/webp;base64,');
    expect(display.length).toBeLessThan(svg.length);
    expect(display.slice(display.indexOf('width="1278"'))).toBe(svg.slice(svg.indexOf('width="1278"')));
    const first = packProofPreview(display, []);
    const subsequent = packProofPreview(display, first.assetIds);
    expect(JSON.stringify(subsequent).length).toBeLessThan(JSON.stringify(first).length / 10);
    console.log(JSON.stringify({ originalBytes: svg.length, displayBytes: display.length, repeatBytes: JSON.stringify(subsequent).length }));
  });
});
