insert into public.delivery_zones (
  name,
  zip_start,
  zip_end,
  fee,
  free_shipping_min_subtotal,
  estimate_days,
  is_active
)
select *
from (
  values
    ('Vitoria', '29000001', '29099999', 12.00::numeric, 350.00::numeric, 1, true),
    ('Vila Velha', '29100001', '29129999', 14.00::numeric, 350.00::numeric, 1, true),
    ('Viana', '29130001', '29139999', 22.00::numeric, 450.00::numeric, 2, true),
    ('Cariacica', '29140001', '29159999', 18.00::numeric, 400.00::numeric, 2, true),
    ('Serra', '29160001', '29184999', 24.00::numeric, 450.00::numeric, 2, true),
    ('Guarapari', '29200001', '29227999', 35.00::numeric, 600.00::numeric, 3, true)
) as seed(name, zip_start, zip_end, fee, free_shipping_min_subtotal, estimate_days, is_active)
where not exists (
  select 1
  from public.delivery_zones existing
  where existing.name = seed.name
);
