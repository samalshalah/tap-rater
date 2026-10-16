# Product gallery template

The custom Google stand is the reference set. Only add galleries for products
already in the catalog, using approved artwork for that exact stand.

Configure `productGalleries` in `src/lib/product-gallery.ts` by product slug and
purchase option (`standard_direct`, `branded_qr_direct`, `hosted_multilink`).
Each option has its own ordered array of source, alt text and caption.
The 57 other existing custom stands use `src/data/custom-product-galleries.json`.
These are seven real raster images per product, following the approved Google
set and Yelp sample. Do not substitute HTML text panels for this image style.

Suggested custom sequence: angled hero, personalization steps, front view,
tap/scan explanation, countertop setting, material details, customization detail.
Keep red customization placeholders when present in the approved design, and
explain that they are replaced on the customer's finished stand. Label illustrative
settings accurately. Never use a different platform's artwork as a placeholder.

Store web-ready WebP masters under `public/product-galleries/<product>/` with
square variants named `<master>-w160.webp`, `-w320`, `-w480`, `-w640`, and `-w1200`.
The responsive helper expects all five variants. Preserve the original master
for the full-size image link. Do not replace production templates or proof assets.

Generated sets live under `public/product-galleries/custom-v3/<product-slug>/`.
Use the matching Google view as a layout reference and the exact product's custom
artwork as the identity reference. Preserve platform logos, printed calls to
action, red placeholders and Tap Rater branding. Social and information stands
must retain their own purpose and wording. Do not overwrite production artwork.
Legacy panels remain only as a fallback for unconfigured future products; none
of the 58 current custom product galleries uses them.
Standard excludes known custom and production-template assets. Products without
custom artwork show an explicit missing-preview message. Multi-Link remains
separate. Slides have unique IDs for thumbnail selection.

Verify both design selections, thumbnail selection, mobile overflow, image files,
and the full-size link before release. The Google set originated from the approved
Amazon image set; its red QR placeholder is an illustration, not a scannable code.
