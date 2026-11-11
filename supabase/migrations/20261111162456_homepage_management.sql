begin;
create table public.homepage_settings (
 id text primary key default 'main' check (id='main'),
 config jsonb not null check (jsonb_typeof(config)='object' and coalesce(jsonb_typeof(config->'sections')='array',false) and coalesce(jsonb_typeof(config->'campaign')='object',false) and octet_length(config::text)<=50000),
 version integer not null default 1 check (version>0),
 updated_at timestamptz not null default now(),
 updated_by uuid references public.profiles(id) on delete set null
);
alter table public.homepage_settings enable row level security;
revoke all on public.homepage_settings from public, anon, authenticated;
grant select(id,config,version,updated_at) on public.homepage_settings to anon,authenticated;
grant all on public.homepage_settings to service_role;
create policy homepage_settings_public_read on public.homepage_settings for select to anon,authenticated using (true);

-- Start with the current published manual hampers; subsequent selection is managed in the backoffice.
with selected as (
 select coalesce(jsonb_agg(id order by position),'[]'::jsonb) as ids from (
  select id,case name when 'Noite Feliz' then 1 when 'Estrela Cadente' then 2 when 'Reis Magos' then 3 when 'Galileia' then 4 else 5 end as position
  from public.products where catalog_source='manual' and fulfillment_route='internal_360' and supplier_id is null
   and shipping_profile='christmas_hamper_2026' and status='active' and is_active and is_purchasable and deleted_at is null
  order by position,name limit 12
 ) products
)
insert into public.homepage_settings(id,config)
select 'main',jsonb_set(jsonb_set('{"sections":[{"id":"campaign","enabled":false},{"id":"smart_merch","enabled":true},{"id":"categories","enabled":true},{"id":"how_to_buy","enabled":true},{"id":"business","enabled":true},{"id":"newsletter","enabled":true}],"campaign":{"productIds":[],"collectionPath":"/categorias/Cabazes","text":{"pt":{"eyebrow":"Natal 2026","title":"Cabazes de Natal para oferecer","description":"Para a tua equipa, os teus clientes ou a família. Escolhe o cabaz e encomenda a quantidade de que precisas.","productCta":"Comprar","collectionCta":"Ver todos os cabazes"},"en":{"eyebrow":"Christmas 2026","title":"Christmas hampers to give","description":"For your team, your clients or your family. Choose a hamper and order the quantity you need.","productCta":"Buy","collectionCta":"View all hampers"},"fr":{"eyebrow":"Noël 2026","title":"Des paniers de Noël à offrir","description":"Pour votre équipe, vos clients ou votre famille. Choisissez votre panier et commandez la quantité souhaitée.","productCta":"Acheter","collectionCta":"Voir tous les paniers"},"es":{"eyebrow":"Navidad 2026","title":"Cestas de Navidad para regalar","description":"Para tu equipo, tus clientes o tu familia. Elige una cesta y pide la cantidad que necesitas.","productCta":"Comprar","collectionCta":"Ver todas las cestas"},"de":{"eyebrow":"Weihnachten 2026","title":"Weihnachtskörbe zum Verschenken","description":"Für Ihr Team, Ihre Kunden oder Ihre Familie. Wählen Sie einen Korb und bestellen Sie die gewünschte Menge.","productCta":"Kaufen","collectionCta":"Alle Geschenkkörbe ansehen"},"it":{"eyebrow":"Natale 2026","title":"Cesti di Natale da regalare","description":"Per il tuo team, i tuoi clienti o la famiglia. Scegli un cesto e ordina la quantità che ti serve.","productCta":"Acquista","collectionCta":"Vedi tutti i cesti"}}}}'::jsonb,'{campaign,productIds}',ids),'{sections,0,enabled}',to_jsonb(jsonb_array_length(ids)>0)) from selected;
commit;
