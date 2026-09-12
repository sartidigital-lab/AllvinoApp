alter table public.catalog_banners
  add column show_text boolean not null default false,
  add column show_cta boolean not null default false,
  add column show_discount_badge boolean not null default false;

comment on column public.catalog_banners.show_text is
  'Controls whether the eyebrow, title and subtitle are rendered over the artwork.';
comment on column public.catalog_banners.show_cta is
  'Controls whether the catalog selection button is rendered over the artwork.';
comment on column public.catalog_banners.show_discount_badge is
  'Controls whether the campaign discount badge is rendered over the artwork.';
