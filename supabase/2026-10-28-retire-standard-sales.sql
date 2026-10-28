-- Retire sales options without deleting products, artwork, devices or order snapshots.
-- The application also blocks standard_direct regardless of the stored active flag.
begin;
update public.product_options
set is_active = false
where option_code = 'standard_direct' and is_active = true;
commit;
