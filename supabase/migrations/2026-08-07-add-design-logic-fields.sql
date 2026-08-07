-- Migration: 2026-08-07-add-design-logic-fields
--
-- Adds the product design-logic model to an EXISTING products table (one
-- that was already created from an earlier version of supabase/schema.sql).
-- If you're setting up a brand-new database instead, you don't need this
-- file at all -- the current supabase/schema.sql already includes these
-- columns in the table definition itself.
--
-- Safe to run multiple times: every statement uses "if not exists" / "or
-- replace" semantics, and no existing column, row, or constraint is
-- dropped, altered destructively, or renamed. Existing products simply get
-- the listed defaults for the new columns until you edit them.
--
-- HOW TO APPLY:
--   1. Open your Neon or Supabase project's SQL editor
--      (Neon: Console -> your project -> SQL Editor)
--      (Supabase: Project -> SQL Editor -> New query)
--   2. Paste the contents of this file and run it
--   3. Confirm with: select column_name from information_schema.columns
--      where table_name = 'products' and column_name like '%design_logic%'
--      or column_name like '%pricing_tier%';
--      -- should return design_logic and pricing_tier
--
-- No application downtime is required -- these are additive column changes
-- only, and the application code already handles both the old and new
-- shape via fallbacks (see normalizeStorefrontProductRow in
-- src/lib/product-repository.ts).

alter table products add column if not exists design_logic text not null default 'standard_platform_locked';
alter table products add column if not exists pricing_tier text not null default 'standard_direct';
alter table products add column if not exists use_case_slugs text[] not null default array[]::text[];
alter table products add column if not exists platform_slug text;
alter table products add column if not exists color_options text[];
alter table products add column if not exists template_images jsonb;
alter table products add column if not exists provider_options jsonb;

-- Add the check constraints separately (Postgres doesn't support "add column
-- ... check (...) if not exists" as one clause) -- these blocks skip
-- re-adding a constraint that already exists, so this stays safe to re-run.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_design_logic_check'
  ) then
    alter table products add constraint products_design_logic_check
      check (design_logic in ('standard_platform_locked', 'branded_platform_template', 'text_action_locked', 'text_action_branded', 'fully_custom_design'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'products_pricing_tier_check'
  ) then
    alter table products add constraint products_pricing_tier_check
      check (pricing_tier in ('standard_direct', 'branded_qr_direct', 'hosted_multi_link', 'custom'));
  end if;
end $$;

create index if not exists products_design_logic_idx on products(design_logic);
create index if not exists products_pricing_tier_idx on products(pricing_tier);
create index if not exists products_use_case_slugs_idx on products using gin(use_case_slugs);
