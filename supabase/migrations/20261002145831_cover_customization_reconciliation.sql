set local lock_timeout = '1s';
set local statement_timeout = '45s';

-- Reconciliation reads only these identifiers. Keep them in a small partial
-- index instead of fetching thousands of wide heap rows for every page.
-- No catalogue values or historical options are changed by this migration.
create index if not exists customization_options_reconciliation_idx
  on public.product_customization_options (supplier_id, variant_id, id)
  include (location_id, service_code)
  where is_active = true;
