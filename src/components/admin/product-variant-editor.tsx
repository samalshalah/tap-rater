"use client";
import {memo,type Dispatch,type SetStateAction} from 'react';
import type {ProductSizeOption,ProductColorOption} from '@/data/migrated-products';
import {AdminButton} from './admin-ui';
import {EditorCard,VariantBooleanSelect,VariantNumberInput,VariantPriceInput,VariantTextInput} from './product-editor-fields';
import {createSizeOption,createColorOption,slugify,formatSku} from './product-editor-model';
type Props={sizeOptions:ProductSizeOption[];colorOptions:ProductColorOption[];setSizeOptions:Dispatch<SetStateAction<ProductSizeOption[]>>;setColorOptions:Dispatch<SetStateAction<ProductColorOption[]>>};
export const ProductVariantEditor=memo(function ProductVariantEditor({sizeOptions,colorOptions,setSizeOptions,setColorOptions}:Props){
  function updateSizeOption(index: number, patch: Partial<ProductSizeOption>) {
    setSizeOptions((current) => current.map((size, itemIndex) => (itemIndex === index ? { ...size, ...patch } : size)));
  }

  function updateColorOption(index: number, patch: Partial<ProductColorOption>) {
    setColorOptions((current) => current.map((color, itemIndex) => (itemIndex === index ? { ...color, ...patch } : color)));
  }


return (<EditorCard title="Variants" description="Structured size and color options. A price-pending size is visible for QA but blocked from checkout.">
          <div className="grid gap-4">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-black text-ink">Size options</p>
                <AdminButton type="button" variant="outline" onClick={() => setSizeOptions((current) => [...current, createSizeOption(current.length)])}>
                  Add size
                </AdminButton>
              </div>
              <div className="mt-3 grid gap-3">
                {sizeOptions.map((size, index) => (
                  <div key={`${size.code}-${index}`} className="grid gap-3 rounded-md border border-line bg-white p-3 text-sm">
                    <div className="grid gap-3 md:grid-cols-4">
                      <VariantTextInput label="Label" value={size.label} onChange={(value) => updateSizeOption(index, { label: value })} />
                      <VariantTextInput label="Code" value={size.code} onChange={(value) => updateSizeOption(index, { code: slugify(value) })} />
                      <VariantTextInput label="SKU suffix" value={size.skuSuffix} onChange={(value) => updateSizeOption(index, { skuSuffix: formatSku(value) })} />
                      <VariantPriceInput
                        label="Price adjustment"
                        value={size.priceAdjustmentCents}
                        onChange={(value) => updateSizeOption(index, { priceAdjustmentCents: value })}
                      />
                    </div>
                    <div className="grid gap-3 md:grid-cols-4">
                      <VariantNumberInput label="Front width mm" value={size.frontWidthMm} onChange={(value) => updateSizeOption(index, { frontWidthMm: value })} />
                      <VariantNumberInput label="Front height mm" value={size.frontHeightMm} onChange={(value) => updateSizeOption(index, { frontHeightMm: value })} />
                      <VariantNumberInput label="Front width in" value={size.frontWidthIn} step="0.01" onChange={(value) => updateSizeOption(index, { frontWidthIn: value })} />
                      <VariantNumberInput label="Front height in" value={size.frontHeightIn} step="0.01" onChange={(value) => updateSizeOption(index, { frontHeightIn: value })} />
                    </div>
                    <div className="grid gap-3 md:grid-cols-4">
                      <VariantNumberInput label="Base depth mm" value={size.baseDepthMm} onChange={(value) => updateSizeOption(index, { baseDepthMm: value })} />
                      <VariantNumberInput label="Base depth in" value={size.baseDepthIn} step="0.01" onChange={(value) => updateSizeOption(index, { baseDepthIn: value })} />
                      <VariantBooleanSelect label="Active" value={size.isActive} onChange={(value) => updateSizeOption(index, { isActive: value })} />
                      <VariantBooleanSelect
                        label="Default"
                        value={size.isDefault}
                        onChange={(value) =>
                          setSizeOptions((current) => current.map((item, itemIndex) => ({ ...item, isDefault: itemIndex === index ? value : value ? false : item.isDefault })))
                        }
                      />
                    </div>
                    <div className="flex justify-end">
                      <AdminButton type="button" variant="danger" onClick={() => setSizeOptions((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                        Remove size
                      </AdminButton>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-black text-ink">Color options</p>
                <AdminButton type="button" variant="outline" onClick={() => setColorOptions((current) => [...current, createColorOption(current.length)])}>
                  Add color
                </AdminButton>
              </div>
              <div className="mt-3 grid gap-3">
                {colorOptions.map((color, index) => (
                  <div key={`${color.code}-${index}`} className="grid gap-3 rounded-md border border-line bg-white p-3 text-sm">
                    <div className="grid gap-3 md:grid-cols-5">
                      <VariantTextInput label="Label" value={color.label} onChange={(value) => updateColorOption(index, { label: value })} />
                      <VariantTextInput label="Code" value={color.code} onChange={(value) => updateColorOption(index, { code: slugify(value) })} />
                      <VariantTextInput label="SKU suffix" value={color.skuSuffix} onChange={(value) => updateColorOption(index, { skuSuffix: formatSku(value) })} />
                      <VariantPriceInput label="Price adjustment" value={color.priceAdjustmentCents ?? 0} onChange={(value) => updateColorOption(index, { priceAdjustmentCents: value ?? 0 })} allowPending={false} />
                      <VariantBooleanSelect label="Active" value={color.isActive} onChange={(value) => updateColorOption(index, { isActive: value })} />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <VariantBooleanSelect
                        label="Default"
                        value={color.isDefault}
                        onChange={(value) =>
                          setColorOptions((current) => current.map((item, itemIndex) => ({ ...item, isDefault: itemIndex === index ? value : value ? false : item.isDefault })))
                        }
                      />
                      <AdminButton type="button" variant="danger" onClick={() => setColorOptions((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                        Remove color
                      </AdminButton>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </EditorCard>);
});
