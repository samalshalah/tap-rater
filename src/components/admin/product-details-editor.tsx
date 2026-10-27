"use client";
import {memo} from 'react';
import type {MigratedProduct} from '@/data/migrated-products';
import {EditorCard,StructuredPreview} from './product-editor-fields';
import {ProductPhysicalDetailsEditor} from './product-physical-details-editor';
import type {ComponentProps} from 'react';
type PhysicalProps=ComponentProps<typeof ProductPhysicalDetailsEditor>;
type Props={product:MigratedProduct; specifications:PhysicalProps['specifications']; includedItems:PhysicalProps['includedItems']; setSpecifications:PhysicalProps['onSpecificationsChange']; setIncludedItems:PhysicalProps['onIncludedItemsChange'];};
export const ProductDetailsEditor=memo(function ProductDetailsEditor({product, specifications, includedItems, setSpecifications, setIncludedItems}:Props){
 return (<EditorCard title="Product Details" description="Structured product content used by the storefront and JSON-LD.">
          <StructuredPreview title="Key Features" rows={(product.keyFeatures ?? []).map((item) => [item.title, item.body])} />
          <StructuredPreview title="How It Works" rows={(product.howItWorks ?? []).map((item) => [String(item.step), `${item.title}: ${item.body}`])} />
          <ProductPhysicalDetailsEditor specifications={specifications} includedItems={includedItems}
            onSpecificationsChange={setSpecifications} onIncludedItemsChange={setIncludedItems} />
          <StructuredPreview title="Product FAQ" rows={(product.productFaqs ?? []).map((item) => [item.question, item.answer])} />
        </EditorCard>);
});
