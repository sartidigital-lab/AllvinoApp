-- Enforce the same coupon invariants in the database as in the admin form.
alter table public.promotions
  add constraint promotions_code_not_empty check (length(trim(code)) > 0),
  add constraint promotions_title_not_empty check (length(trim(title)) > 0),
  add constraint promotions_percent_max check (discount_type <> 'percent' or discount_value <= 100),
  add constraint promotions_window_valid check (ends_at is null or starts_at is null or ends_at >= starts_at);

notify pgrst, 'reload schema';
