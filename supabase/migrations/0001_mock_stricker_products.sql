insert into public.products (
  supplier_id,
  external_id,
  sku,
  name,
  slug,
  short_description,
  description,
  brand,
  material,
  dimensions,
  weight,
  country_of_origin,
  status,
  is_active,
  is_featured,
  is_customizable,
  min_order_quantity,
  lead_time_days,
  seo_title,
  seo_description,
  supplier_payload
)
values
  (
    (select id from public.suppliers where slug = 'stricker' limit 1),
    'mock-stricker-001',
    'LC-MUG-001',
    'Caneca cerâmica personalizada',
    'caneca-ceramica-personalizada-lc-mug-001',
    'Caneca em cerâmica para brindes promocionais e campanhas corporativas.',
    'Caneca em cerâmica branca, ideal para personalização com logótipo, mensagens promocionais e campanhas de merchandising corporativo.',
    'Stricker',
    'Cerâmica',
    'Ø8,2 x 9,5 cm',
    0.320,
    'CN',
    'active',
    true,
    true,
    true,
    50,
    7,
    'Caneca Cerâmica Personalizada | Loja Creativ',
    'Caneca cerâmica personalizada para empresas, eventos, feiras e campanhas promocionais.',
    '{"source":"mock","supplier":"stricker"}'::jsonb
  ),
  (
    (select id from public.suppliers where slug = 'stricker' limit 1),
    'mock-stricker-002',
    'LC-PEN-002',
    'Esferográfica metálica premium',
    'esferografica-metalica-premium-lc-pen-002',
    'Esferográfica metálica elegante para merchandising empresarial.',
    'Esferográfica metálica com acabamento premium, adequada para eventos corporativos, ofertas comerciais e kits institucionais.',
    'Stricker',
    'Metal',
    '13,8 x Ø1 cm',
    0.028,
    'CN',
    'active',
    true,
    true,
    true,
    100,
    6,
    'Esferográfica Metálica Personalizada | Loja Creativ',
    'Esferográfica metálica personalizada para merchandising corporativo e gifts empresariais.',
    '{"source":"mock","supplier":"stricker"}'::jsonb
  ),
  (
    (select id from public.suppliers where slug = 'stricker' limit 1),
    'mock-stricker-003',
    'LC-BAG-003',
    'Saco de algodão personalizado',
    'saco-algodao-personalizado-lc-bag-003',
    'Saco reutilizável em algodão para campanhas sustentáveis.',
    'Saco promocional em algodão, reutilizável e personalizável, indicado para eventos, feiras, lojas, campanhas ambientais e acções de marca.',
    'Stricker',
    'Algodão',
    '38 x 42 cm',
    0.085,
    'IN',
    'active',
    true,
    false,
    true,
    100,
    8,
    'Saco de Algodão Personalizado | Loja Creativ',
    'Saco de algodão personalizado para empresas, eventos e campanhas sustentáveis.',
    '{"source":"mock","supplier":"stricker"}'::jsonb
  ),
  (
    (select id from public.suppliers where slug = 'stricker' limit 1),
    'mock-stricker-004',
    'LC-BTL-004',
    'Garrafa térmica em aço inox',
    'garrafa-termica-aco-inox-lc-btl-004',
    'Garrafa térmica premium para gifts empresariais.',
    'Garrafa térmica em aço inox, com parede dupla, ideal para ofertas empresariais, onboarding de colaboradores e campanhas premium.',
    'Stricker',
    'Aço inox',
    'Ø7 x 25 cm',
    0.410,
    'CN',
    'active',
    true,
    true,
    true,
    25,
    9,
    'Garrafa Térmica Personalizada | Loja Creativ',
    'Garrafa térmica personalizada em aço inox para gifts empresariais premium.',
    '{"source":"mock","supplier":"stricker"}'::jsonb
  ),
  (
    (select id from public.suppliers where slug = 'stricker' limit 1),
    'mock-stricker-005',
    'LC-TSHIRT-005',
    'T-shirt promocional unissexo',
    't-shirt-promocional-unissexo-lc-tshirt-005',
    'T-shirt promocional personalizável para equipas, eventos e campanhas.',
    'T-shirt unissexo em algodão, disponível em várias cores e tamanhos, indicada para eventos, staff, campanhas promocionais e activações de marca.',
    'Stricker',
    'Algodão',
    'S a XXL',
    0.180,
    'BD',
    'active',
    true,
    false,
    true,
    50,
    10,
    'T-shirt Promocional Personalizada | Loja Creativ',
    'T-shirt promocional personalizada para empresas, eventos, equipas e campanhas.',
    '{"source":"mock","supplier":"stricker"}'::jsonb
  )
on conflict (supplier_id, external_id)
do update set
  sku = excluded.sku,
  name = excluded.name,
  slug = excluded.slug,
  short_description = excluded.short_description,
  description = excluded.description,
  brand = excluded.brand,
  material = excluded.material,
  dimensions = excluded.dimensions,
  weight = excluded.weight,
  country_of_origin = excluded.country_of_origin,
  status = excluded.status,
  is_active = excluded.is_active,
  is_featured = excluded.is_featured,
  is_customizable = excluded.is_customizable,
  min_order_quantity = excluded.min_order_quantity,
  lead_time_days = excluded.lead_time_days,
  seo_title = excluded.seo_title,
  seo_description = excluded.seo_description,
  supplier_payload = excluded.supplier_payload,
  updated_at = now();

insert into public.product_variants (
  product_id,
  supplier_id,
  external_variant_id,
  sku,
  color_name,
  color_hex,
  size,
  capacity,
  material,
  barcode,
  is_active,
  supplier_payload
)
select
  p.id,
  p.supplier_id,
  p.external_id || '-variant-default',
  p.sku || '-DEFAULT',
  case
    when p.sku = 'LC-MUG-001' then 'Branco'
    when p.sku = 'LC-PEN-002' then 'Prateado'
    when p.sku = 'LC-BAG-003' then 'Natural'
    when p.sku = 'LC-BTL-004' then 'Preto'
    when p.sku = 'LC-TSHIRT-005' then 'Branco'
    else 'Standard'
  end,
  case
    when p.sku = 'LC-MUG-001' then '#FFFFFF'
    when p.sku = 'LC-PEN-002' then '#C0C0C0'
    when p.sku = 'LC-BAG-003' then '#E6D3B3'
    when p.sku = 'LC-BTL-004' then '#111111'
    when p.sku = 'LC-TSHIRT-005' then '#FFFFFF'
    else '#FFFFFF'
  end,
  case
    when p.sku = 'LC-TSHIRT-005' then 'M'
    else null
  end,
  null,
  p.material,
  null,
  true,
  '{"source":"mock"}'::jsonb
from public.products p
where p.external_id in (
  'mock-stricker-001',
  'mock-stricker-002',
  'mock-stricker-003',
  'mock-stricker-004',
  'mock-stricker-005'
)
on conflict (supplier_id, external_variant_id)
do update set
  sku = excluded.sku,
  color_name = excluded.color_name,
  color_hex = excluded.color_hex,
  size = excluded.size,
  capacity = excluded.capacity,
  material = excluded.material,
  is_active = excluded.is_active,
  supplier_payload = excluded.supplier_payload,
  updated_at = now();

delete from public.product_prices
where product_id in (
  select id
  from public.products
  where external_id in (
    'mock-stricker-001',
    'mock-stricker-002',
    'mock-stricker-003',
    'mock-stricker-004',
    'mock-stricker-005'
  )
);

insert into public.product_prices (
  product_id,
  variant_id,
  supplier_id,
  currency,
  quantity_min,
  quantity_max,
  supplier_price,
  base_price,
  margin_percentage,
  final_price
)
select
  v.product_id,
  v.id,
  v.supplier_id,
  'EUR',
  price_data.quantity_min,
  price_data.quantity_max,
  price_data.supplier_price,
  price_data.supplier_price,
  35,
  round((price_data.supplier_price * 1.35)::numeric, 4)
from public.product_variants v
join public.products p on p.id = v.product_id
cross join lateral (
  values
    (
      50,
      99,
      case
        when p.sku = 'LC-MUG-001' then 2.15
        when p.sku = 'LC-PEN-002' then 0.72
        when p.sku = 'LC-BAG-003' then 1.35
        when p.sku = 'LC-BTL-004' then 6.90
        when p.sku = 'LC-TSHIRT-005' then 3.80
        else 1.00
      end
    ),
    (
      100,
      249,
      case
        when p.sku = 'LC-MUG-001' then 1.95
        when p.sku = 'LC-PEN-002' then 0.62
        when p.sku = 'LC-BAG-003' then 1.20
        when p.sku = 'LC-BTL-004' then 6.45
        when p.sku = 'LC-TSHIRT-005' then 3.55
        else 0.90
      end
    ),
    (
      250,
      null,
      case
        when p.sku = 'LC-MUG-001' then 1.72
        when p.sku = 'LC-PEN-002' then 0.55
        when p.sku = 'LC-BAG-003' then 1.05
        when p.sku = 'LC-BTL-004' then 5.95
        when p.sku = 'LC-TSHIRT-005' then 3.25
        else 0.80
      end
    )
) as price_data(quantity_min, quantity_max, supplier_price)
where p.external_id in (
  'mock-stricker-001',
  'mock-stricker-002',
  'mock-stricker-003',
  'mock-stricker-004',
  'mock-stricker-005'
);

insert into public.product_stocks (
  product_id,
  variant_id,
  supplier_id,
  warehouse_code,
  available_quantity,
  reserved_quantity,
  incoming_quantity,
  expected_restock_date,
  last_synced_at
)
select
  v.product_id,
  v.id,
  v.supplier_id,
  'PT-MOCK',
  case
    when p.sku = 'LC-MUG-001' then 1250
    when p.sku = 'LC-PEN-002' then 7800
    when p.sku = 'LC-BAG-003' then 3400
    when p.sku = 'LC-BTL-004' then 620
    when p.sku = 'LC-TSHIRT-005' then 2100
    else 0
  end,
  0,
  case
    when p.sku = 'LC-BTL-004' then 500
    else 0
  end,
  case
    when p.sku = 'LC-BTL-004' then current_date + interval '21 days'
    else null
  end,
  now()
from public.product_variants v
join public.products p on p.id = v.product_id
where p.external_id in (
  'mock-stricker-001',
  'mock-stricker-002',
  'mock-stricker-003',
  'mock-stricker-004',
  'mock-stricker-005'
)
on conflict (product_id, variant_id, supplier_id, warehouse_code)
do update set
  available_quantity = excluded.available_quantity,
  reserved_quantity = excluded.reserved_quantity,
  incoming_quantity = excluded.incoming_quantity,
  expected_restock_date = excluded.expected_restock_date,
  last_synced_at = now(),
  updated_at = now();

delete from public.product_images
where product_id in (
  select id
  from public.products
  where external_id in (
    'mock-stricker-001',
    'mock-stricker-002',
    'mock-stricker-003',
    'mock-stricker-004',
    'mock-stricker-005'
  )
);

insert into public.product_images (
  product_id,
  variant_id,
  supplier_id,
  external_url,
  storage_url,
  alt_text,
  sort_order,
  image_type,
  is_primary
)
select
  p.id,
  null,
  p.supplier_id,
  case
    when p.sku = 'LC-MUG-001' then 'https://placehold.co/900x900?text=Caneca'
    when p.sku = 'LC-PEN-002' then 'https://placehold.co/900x900?text=Esferografica'
    when p.sku = 'LC-BAG-003' then 'https://placehold.co/900x900?text=Saco'
    when p.sku = 'LC-BTL-004' then 'https://placehold.co/900x900?text=Garrafa'
    when p.sku = 'LC-TSHIRT-005' then 'https://placehold.co/900x900?text=T-shirt'
    else 'https://placehold.co/900x900?text=Produto'
  end,
  null,
  p.name,
  0,
  'main',
  true
from public.products p
where p.external_id in (
  'mock-stricker-001',
  'mock-stricker-002',
  'mock-stricker-003',
  'mock-stricker-004',
  'mock-stricker-005'
);

insert into public.printing_techniques (
  supplier_id,
  external_id,
  name,
  slug,
  description,
  max_colors,
  supports_full_color,
  setup_cost,
  price_per_unit,
  is_active
)
values
  (
    (select id from public.suppliers where slug = 'stricker' limit 1),
    'mock-screen-printing',
    'Serigrafia',
    'serigrafia',
    'Técnica recomendada para grandes quantidades e cores sólidas.',
    4,
    false,
    25.00,
    0.18,
    true
  ),
  (
    (select id from public.suppliers where slug = 'stricker' limit 1),
    'mock-laser',
    'Gravação laser',
    'gravacao-laser',
    'Técnica premium para produtos metálicos, madeira e aço inox.',
    1,
    false,
    30.00,
    0.35,
    true
  ),
  (
    (select id from public.suppliers where slug = 'stricker' limit 1),
    'mock-uv',
    'Impressão UV',
    'impressao-uv',
    'Impressão digital indicada para resultados a cores e pequenos detalhes.',
    null,
    true,
    35.00,
    0.45,
    true
  )
on conflict (supplier_id, external_id)
do update set
  name = excluded.name,
  slug = excluded.slug,
  description = excluded.description,
  max_colors = excluded.max_colors,
  supports_full_color = excluded.supports_full_color,
  setup_cost = excluded.setup_cost,
  price_per_unit = excluded.price_per_unit,
  is_active = excluded.is_active,
  updated_at = now();