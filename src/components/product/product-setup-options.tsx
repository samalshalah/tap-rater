"use client";
import type {ProductSetupChooserProduct} from './product-setup-chooser-types';
import type {PurchaseOption,PurchaseOptionId} from '@/lib/purchase-options';
import type {ProductSizeOption,ProductColorOption} from '@/data/migrated-products';
import {singleStandPrice,type OffersSettings} from '@/lib/offers';
import {formatPrice} from '@/lib/products';
import {formatSizeLabel,getOptionDisplayLabel,getOptionShortSummary,getOptionSummary} from './product-setup-model';
type Props = {
 product: ProductSetupChooserProduct;
 setupOptions: PurchaseOption[];
 selectedOptionId?: PurchaseOptionId;
 chooseOption: (id: PurchaseOptionId) => void;
 offers?: OffersSettings | null;
 activeSizes: ProductSizeOption[];
 selectedSize?: ProductSizeOption;
 setSelectedSizeCode: (code: string) => void;
 activeColors: ProductColorOption[];
 selectedColor?: ProductColorOption;
 setSelectedColorCode: (code: string) => void;
};
export function ProductSetupOptions({product, setupOptions, selectedOptionId, chooseOption, offers, activeSizes, selectedSize, setSelectedSizeCode, activeColors, selectedColor, setSelectedColorCode}: Props) {
 return <><div className="text-sm leading-6 text-muted">
          <p>Your logo, business name, NFC and QR included.</p>
          <p>Approve your design before payment.</p>
        </div>
        {activeSizes.length ? (
          <div className="grid gap-2">
            <p className="text-sm font-semibold text-ink">Size</p>
            <div className="grid grid-cols-2 gap-2">
              {activeSizes.map((size) => {
                const pending = size.priceAdjustmentCents === null;
                return (
                  <label
                    key={size.code}
                    className={
                      pending
                        ? "flex cursor-not-allowed flex-col items-start gap-1 rounded-md border border-line bg-white px-3 py-2 opacity-55"
                        : selectedSize?.code === size.code
                          ? "flex cursor-pointer flex-col items-start gap-1 rounded-md border border-brand bg-panel px-3 py-2"
                          : "flex cursor-pointer flex-col items-start gap-1 rounded-md border border-line bg-white px-3 py-2 hover:border-brand/50"
                    }
                    aria-disabled={pending}
                  >
                    <span className="flex w-full min-w-0 items-center gap-2">
                      <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-ink">
                        <input
                          type="radio"
                          name={`${product.slug}-size`}
                          checked={selectedSize?.code === size.code}
                          disabled={pending}
                          onChange={() => {
                            if (!pending) setSelectedSizeCode(size.code);
                          }}
                          className="h-4 w-4 shrink-0 accent-brand"
                        />
                        <span className="min-w-0 truncate">{formatSizeLabel(size.label)}</span>
                      </span>
                    </span>
                    <span className="pl-6 text-[11px] leading-4 text-muted">
                        {size.frontWidthIn.toFixed(2)} x {size.frontHeightIn.toFixed(2)} in
                        <span className="mx-1 text-line">/</span>
                        {size.frontWidthMm} x {size.frontHeightMm} mm
                    </span>
                    <span className={pending ? "pl-6 text-[11px] font-semibold leading-4 text-muted" : "pl-6 text-[11px] font-semibold leading-4 text-brand"}>
                      {pending ? "Coming soon" : "Included"}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ) : null}

        {activeColors.length ? (
          <div className="grid gap-2">
            {activeColors.length === 1 ? (
              <div className="flex items-center gap-3 text-sm">
                <span className="font-semibold text-ink">Color</span>
                <span className="inline-flex h-4 w-4 rounded-full border border-line bg-white shadow-sm" aria-hidden="true" />
                <span className="font-semibold text-ink">{activeColors[0].label}</span>
              </div>
            ) : (
              <>
                <p className="text-sm font-semibold text-ink">Color</p>
                <div className="grid gap-2 sm:grid-cols-2">
              {activeColors.map((color) => (
                <label
                  key={color.code}
                  className={
                    selectedColor?.code === color.code
                      ? "flex cursor-pointer items-center gap-3 rounded-md border border-brand bg-panel p-3"
                      : "flex cursor-pointer items-center gap-3 rounded-md border border-line bg-white p-3 hover:border-brand/50"
                  }
                >
                  <input
                    type="radio"
                    name={`${product.slug}-color`}
                    checked={selectedColor?.code === color.code}
                    onChange={() => setSelectedColorCode(color.code)}
                    className="h-4 w-4 accent-brand"
                  />
                  <span className="inline-flex h-5 w-5 rounded-full border border-line bg-white" aria-hidden="true" />
                  <span className="text-sm font-semibold text-ink">{color.label}</span>
                </label>
              ))}
                </div>
              </>
            )}
          </div>
        ) : null}</>;
}
