"use client";
import {memo} from 'react';
import type {MigratedProduct} from '@/data/migrated-products';
import type {generateProductSeo} from '@/lib/product-seo';
import {EditorCard,Input,Textarea} from './product-editor-fields';
import {readOptionalString} from './product-editor-model';
type Props={product:MigratedProduct; seoPreview:ReturnType<typeof generateProductSeo>; slug:string;};
export const ProductSeoEditor=memo(function ProductSeoEditor({product, seoPreview, slug}:Props){
 return (<EditorCard title="SEO" description="Metadata, internal search terms, canonical preview, and Google-style search preview.">
          <Input
            name="seoTitle"
            label="SEO title override"
            defaultValue={product.seoTitle ?? ""}
            placeholder={seoPreview.generatedTitle}
            required={false}
          />
          <Textarea
            name="seoDescription"
            label="Meta description override"
            defaultValue={product.seoDescription ?? ""}
            placeholder={seoPreview.generatedDescription}
            required={false}
          />
          <Textarea
            name="searchTerms"
            label="Search terms"
            defaultValue={(product.searchKeywords ?? []).join("\n")}
            placeholder="One internal search term per line"
            required={false}
          />
          <div className="grid gap-2 rounded-md border border-line bg-[#f7f8fa] px-3 py-3 text-xs text-muted">
            <p>
              <span className="font-black text-ink">URL:</span> /product/{slug || "product-handle"}
            </p>
            <p>
              <span className="font-black text-ink">Generated title:</span> {seoPreview.generatedTitle}
            </p>
            <p>
              <span className="font-black text-ink">Generated meta:</span> {seoPreview.generatedDescription}
            </p>
          </div>
          <div className="rounded-md border border-line bg-white p-4">
            <p className="text-lg font-semibold leading-6 text-[#1a0dab]">{readOptionalString(String(product.seoTitle ?? "")) ?? seoPreview.generatedTitle}</p>
            <p className="mt-1 text-sm text-[#006621]">taprater.com/product/{slug || "product-handle"}</p>
            <p className="mt-1 text-sm leading-5 text-[#545454]">{readOptionalString(String(product.seoDescription ?? "")) ?? seoPreview.generatedDescription}</p>
          </div>
        </EditorCard>);
});
