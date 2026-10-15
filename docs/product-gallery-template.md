# Product gallery template

The custom Google stand is the reference set. Only add galleries for products
already in the catalog, using approved artwork for that exact stand.

Configure `productGalleries` in `src/lib/product-gallery.ts` by product slug and
purchase option (`standard_direct`, `branded_qr_direct`, `hosted_multilink`).
Each option has its own ordered array of source, alt text and caption.

Suggested custom sequence: angled hero, personalization steps, front view,
tap/scan explanation, countertop setting, material details, customization detail.
Keep red customization placeholders when present in the approved design, and
explain that they are replaced on the customer's finished stand. Label illustrative
settings accurately. Never use a different platform's artwork as a placeholder.

Store web-ready WebP masters under `public/product-galleries/<product>/` with
square variants named `<master>-w160.webp`, `-w320`, `-w480`, `-w640`, and `-w1200`.
The responsive helper expects all five variants. Preserve the original master
for the full-size image link. Do not replace production templates or proof assets.

Without a configured gallery, custom uses that product's own angled image and
front artwork with five HTML information panels: personalization steps, tap/scan,
placement, details, and personalization explanation. This produces seven views
when both source assets exist. The front image is explicitly labeled as flat
artwork, not a new product photo. Panels preserve the source pixels, derive copy
from the product's title and use case, and never reuse Google's artwork.
Standard excludes known custom and production-template assets. Products without
custom artwork show an explicit missing-preview message. Multi-Link remains
separate. Slides have unique IDs because multiple panels use the same source.

Verify both design selections, thumbnail selection, mobile overflow, image files,
and the full-size link before release. The Google set originated from the approved
Amazon image set; its red QR placeholder is an illustration, not a scannable code.
