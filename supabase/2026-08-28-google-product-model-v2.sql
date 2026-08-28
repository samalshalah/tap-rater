alter table products
  add column if not exists search_keywords text[] not null default '{}',
  add column if not exists size_options jsonb not null default '[]'::jsonb,
  add column if not exists color_options jsonb not null default '[]'::jsonb,
  add column if not exists key_features jsonb not null default '[]'::jsonb,
  add column if not exists how_it_works jsonb not null default '[]'::jsonb,
  add column if not exists specifications jsonb not null default '[]'::jsonb,
  add column if not exists included_items jsonb not null default '[]'::jsonb,
  add column if not exists product_faqs jsonb not null default '[]'::jsonb;

alter table products
  alter column size_options type jsonb using coalesce(to_jsonb(size_options), '[]'::jsonb),
  alter column color_options type jsonb using coalesce(to_jsonb(color_options), '[]'::jsonb),
  alter column key_features type jsonb using coalesce(to_jsonb(key_features), '[]'::jsonb),
  alter column how_it_works type jsonb using coalesce(to_jsonb(how_it_works), '[]'::jsonb),
  alter column specifications type jsonb using coalesce(to_jsonb(specifications), '[]'::jsonb),
  alter column included_items type jsonb using coalesce(to_jsonb(included_items), '[]'::jsonb),
  alter column product_faqs type jsonb using coalesce(to_jsonb(product_faqs), '[]'::jsonb);
