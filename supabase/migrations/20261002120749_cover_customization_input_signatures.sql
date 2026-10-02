-- Signature reads need only IDs/revisions, not the large canonical payloads.
-- These small covering indexes let PostgreSQL avoid loading their heap/TOAST.
set local lock_timeout = '1s';
set local statement_timeout = '15s';

create index products_customization_revision_idx
  on public.products (supplier_id, id) include (external_id, updated_at);
create index variants_customization_revision_idx
  on public.product_variants (supplier_id, id) include (product_id, updated_at);
create index locations_customization_revision_idx
  on public.product_customization_locations (supplier_id, id) include (updated_at)
  where variant_id is not null;
create index components_customization_revision_idx
  on public.product_customization_components (supplier_id, id) include (updated_at);
create index prices_customization_revision_idx
  on public.printing_price_tables (supplier_id, id) include (updated_at);
create index source_customization_revision_idx
  on public.supplier_customization_options_cache (supplier_id, language, last_seen_at, service_code)
  include (payload_hash);

-- Rollback: drop the six *_customization_revision_idx indexes above.
