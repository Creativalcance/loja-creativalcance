create index if not exists idx_product_categories_product_id
  on public.product_categories(product_id);
create index if not exists idx_product_categories_category_id
  on public.product_categories(category_id);
create index if not exists idx_product_categories_is_primary
  on public.product_categories(is_primary);
create index if not exists fulfillment_groups_order_idx
  on public.fulfillment_groups(order_id);
create index if not exists fulfillment_groups_status_idx
  on public.fulfillment_groups(status, created_at);
create index if not exists fulfillment_groups_supplier_id_idx
  on public.fulfillment_groups(supplier_id) where supplier_id is not null;
