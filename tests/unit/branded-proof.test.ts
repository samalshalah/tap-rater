import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";
import jsQR from "jsqr";
import { migratedProducts } from "@/data/migrated-products";
import { bindBrandedHostedCheckout, createBrandedProof, getPaidBrandedHostedReservation, reserveBrandedHostedDestination, verifyBrandedCheckoutProofs } from "@/lib/branded-proof";
import { validateCheckoutCart } from "@/lib/checkout";
import { generateProductionArtworkForOrderLineItem, getProductionArtworkTemplate, type ProductionArtworkAssetResolver } from "@/lib/production-artwork";
import { getPrintLogoRegion } from "@/lib/print-artwork-renderer";
import type { HostedPageTextStorage } from "@/lib/hosted-pages/repository";
import { checkoutCartSchema } from "@/lib/validators";

const product = { ...migratedProducts.find((item) => item.slug === "connect-with-us-stand")!, supportsMultiLink: true };
const logoKey = `products/customer-setup-${product.slug}/center_asset/test-logo.png`;
const setup = {
  destinationUrl: "https://taprater.com/contact-us", businessName: "Tap Rater",
  logoStorageKey: logoKey, logoMediaUrl: `/api/media/product/${logoKey}`,
  fontSizePercent: 115, logoSizePercent: 125, logoFitMode: "contain", logoBackgroundMode: "original",
  logoOffsetXPercent: 12, logoOffsetYPercent: -10, showBusinessNameOnProof: true
};
afterEach(() => vi.unstubAllEnvs());
function memoryStore() {
  const values = new Map<string, string>();
  const storage: HostedPageTextStorage = {
    getText: async (key) => values.get(key) ?? null,
    putText: async (key, value) => { values.set(key, value); },
    putTextIfAbsent: async (key, value) => { if (values.has(key)) return false; values.set(key, value); return true; }
  };
  return { storage, values };
}
const resolver: ProductionArtworkAssetResolver = async (url) => {
  const file = url.includes("customer-setup-") ? "public/uploads/brand/tap-rater-logo.png" : `public${url}`;
  const bytes = await readFile(file);
  const metadata = await sharp(bytes).metadata();
  return { dataUri: `data:image/png;base64,${bytes.toString("base64")}`, contentType: "image/png", contentHash: createHash("sha256").update(bytes).digest("hex"), dimensions: { width: metadata.width!, height: metadata.height! } };
};

describe("Branded approval and printing", () => {
  it.each(["google-review-stand", "connect-with-us-stand"])("clears the inventory placeholders for %s", async (slug) => {
    const selected = migratedProducts.find((item) => item.slug === slug)!;
    const { storage } = memoryStore();
    const proof = await createBrandedProof(selected, { ...setup, logoStorageKey: `products/customer-setup-${slug}/center_asset/test-logo.png` }, storage, resolver);
    const { data } = await sharp(Buffer.from(proof.svg), { density: 300 }).resize(1278, 1949).extract({ left: 0, top: 0, width: 1278, height: 500 }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    let redPixels = 0;
    for (let index = 0; index < data.length; index += 3) if (data[index] > 220 && data[index + 1] < 60 && data[index + 2] < 60) redPixels++;
    expect(redPixels).toBe(0);
  });
  it.each(["centered", "adjusted"])("uses matching %s preview and paid artwork, with a decodable destination QR", async (placement) => {
    const { storage, values } = memoryStore();
    const design = placement === "centered" ? { ...setup, logoOffsetXPercent: 0, logoOffsetYPercent: 0 } : setup;
    const proof = await createBrandedProof(product, design, storage, resolver);
    expect([...values.values()].every((value) => !value.includes("<svg"))).toBe(true);
    const input = checkoutCartSchema.parse({ items: [{ productId: product.slug, optionId: "branded_qr_direct", quantity: 2, setup: { ...design, ...proof.snapshot, proofReceiptId: proof.proofReceiptId, proofApproved: true, proofApprovalSnapshot: proof.snapshot } }] });
    expect(input.items[0].setup?.fontSizePercent).toBe(115);
    expect(input.items[0].setup?.logoSizePercent).toBe(125);
    const cart = validateCheckoutCart(input.items, [product]);
    expect(cart.ok).toBe(true);
    if (!cart.ok) throw new Error(cart.message);
    await verifyBrandedCheckoutProofs(cart.rows, "attempt-1", storage);
    const put = vi.fn().mockResolvedValue(undefined);
    const final = await generateProductionArtworkForOrderLineItem({ item: cart.rows[0], orderReference: "cs_test_proof", lineItemIndex: 0, assetResolver: resolver }, { put });
    expect(final.setup?.productionArtwork).toMatchObject({ status: "generated", widthPx: 1278, heightPx: 1949, dpi: 300 });
    const svg = put.mock.calls[0][1] as string;
    const visual = (value: string) => value.replace(/<metadata>.*?<\/metadata>/s, "");
    expect(visual(svg)).toBe(visual(proof.svg));
    const rendered = await sharp(Buffer.from(svg), { density: 300 }).resize(1278, 1949).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const qr = jsQR(new Uint8ClampedArray(rendered.data), rendered.info.width, rendered.info.height);
    expect(qr?.data).toBe(setup.destinationUrl);
    expect(svg).not.toContain("<text");
    expect(svg).toContain('width="4.26in"');
    expect(svg).toContain('<rect x="270" y="60"');
    if (process.env.TAP_RATER_PROOF_ARTIFACTS && placement === "centered") {
      const directory = process.env.TAP_RATER_PROOF_ARTIFACTS;
      await mkdir(directory, { recursive: true });
      await writeFile(join(directory, "branded-print-sample.svg"), svg);
      await sharp(Buffer.from(svg), { density: 300 }).resize(1278, 1949).png().withMetadata({ density: 300 }).toFile(join(directory, "branded-print-sample.png"));
      await writeFile(join(directory, "print-verification.json"), JSON.stringify({ simulatedOrder: true, placement, logoOffsetXPercent: design.logoOffsetXPercent, logoOffsetYPercent: design.logoOffsetYPercent, previewMatchesFinal: visual(svg) === visual(proof.svg), decodedQrDestination: qr?.data, widthPx: rendered.info.width, heightPx: rendered.info.height, productionArtwork: final.setup?.productionArtwork }, null, 2));
    }
    await generateProductionArtworkForOrderLineItem({ item: final, orderReference: "cs_test_proof", lineItemIndex: 0, assetResolver: resolver }, { put });
    expect(put).toHaveBeenCalledTimes(1);
  });

  it.each([75, 100, 125, 160])("keeps a centered logo centered at %i percent size", (logoSizePercent) => {
    const template = getProductionArtworkTemplate({ productId: product.slug, optionId: "branded_qr_direct", title: product.title, sku: product.sku, quantity: 1, unitAmountCents: 4900, lineSubtotalCents: 4900, setup: { frontTemplateUrl: product.assetSet?.brandedFrontTemplateUrl } })!;
    const region = getPrintLogoRegion(template.logoRegion, { logoSizePercent, logoOffsetXPercent: 0, logoOffsetYPercent: 0 });
    expect(Math.abs(region.x + region.width / 2 - template.widthPx / 2)).toBeLessThanOrEqual(1.5);
    expect(region.x).toBeGreaterThanOrEqual(template.safeMarginPx);
    expect(region.x + region.width).toBeLessThanOrEqual(template.widthPx - template.safeMarginPx);
  });

  it.each(["businessName", "generatedQrValue", "fontSizePercent", "logoContentHash"])("rejects a modified %s even if the client changes its approval snapshot", async (field) => {
    const { storage } = memoryStore();
    const proof = await createBrandedProof(product, setup, storage, resolver);
    const cart = validateCheckoutCart([{ productId: product.slug, optionId: "branded_qr_direct", quantity: 1, setup: { ...setup, ...proof.snapshot, optionCode: "branded_qr_direct", proofReceiptId: proof.proofReceiptId, proofApproved: true, proofApprovalSnapshot: proof.snapshot } }], [product]);
    if (!cart.ok) throw new Error(cart.message);
    Object.assign(cart.rows[0].setup, { [field]: field === "fontSizePercent" ? 80 : "changed" });
    await expect(verifyBrandedCheckoutProofs(cart.rows, "attempt-1", storage)).rejects.toThrow("artwork changed");
  });

  it("reserves the actual hosted QR before approval and binds it to only one checkout", async () => {
    vi.stubEnv("TAP_RATER_ENABLE_HOSTED_PURCHASING", "true");
    const { storage } = memoryStore();
    const reservation = await reserveBrandedHostedDestination(product.slug, storage, "https://taprater.com");
    const hostedSetup = { ...setup, destinationUrl: undefined, serviceAddon: "hosted_multilink", hostedReservationId: reservation.id };
    const proof = await createBrandedProof(product, hostedSetup, storage, resolver);
    expect(proof.snapshot.generatedQrValue).toBe(reservation.url);
    const cart = validateCheckoutCart([{ productId: product.slug, optionId: "branded_qr_direct", quantity: 1, setup: { ...hostedSetup, ...proof.snapshot, optionCode: "branded_qr_direct", proofReceiptId: proof.proofReceiptId, proofApproved: true, proofApprovalSnapshot: proof.snapshot } }], [product]);
    if (!cart.ok) throw new Error(cart.message);
    await verifyBrandedCheckoutProofs(cart.rows, "attempt-1", storage);
    await verifyBrandedCheckoutProofs(cart.rows, "attempt-1", storage);
    await expect(verifyBrandedCheckoutProofs(cart.rows, "attempt-2", storage)).rejects.toThrow("another checkout");
    await bindBrandedHostedCheckout(cart.rows, "cs_test_proof", storage);
    await bindBrandedHostedCheckout(cart.rows, "cs_test_proof", storage);
    await expect(bindBrandedHostedCheckout(cart.rows, "cs_test_other", storage)).rejects.toThrow("different checkout");
    expect((await getPaidBrandedHostedReservation(cart.rows[0], "cs_test_proof", storage))?.url).toBe(proof.snapshot.generatedQrValue);
    await expect(getPaidBrandedHostedReservation(cart.rows[0], "cs_test_other", storage)).rejects.toThrow("does not match");
    vi.unstubAllEnvs();
  });

  it("rejects low-resolution logos and never creates an approval receipt", async () => {
    const { storage, values } = memoryStore();
    const lowResolution: ProductionArtworkAssetResolver = async (url) => ({ ...await resolver(url), ...(url.includes("customer-setup-") ? { dimensions: { width: 64, height: 64 } } : {}) });
    await expect(createBrandedProof(product, setup, storage, lowResolution)).rejects.toThrow("300 DPI");
    expect(values.size).toBe(0);
  });
});
