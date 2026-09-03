insert into site_content (key, type, status, payload, updated_at)
values
  (
    'shipping_settings',
    'section',
    'published',
    '{
      "shippingMode": "flat",
      "flatShippingAmountCents": 1200,
      "allowedCountryCodes": ["US"],
      "handlingTimeText": "",
      "supportedRegionsText": "United States",
      "defaultCarrierNotes": "",
      "customerFacingShippingNote": "Shipping is $12 under $55 and free at $55 or more."
    }'::jsonb,
    now()
  ),
  (
    'tax_settings',
    'section',
    'published',
    '{
      "taxMode": "manual",
      "manualTaxRateBps": 600,
      "taxLabel": "Virginia sales tax",
      "taxShipping": false,
      "customerFacingTaxNote": "Estimated sales tax is calculated before payment."
    }'::jsonb,
    now()
  )
on conflict (key)
do update set
  type = excluded.type,
  status = excluded.status,
  payload = excluded.payload,
  updated_at = excluded.updated_at;
