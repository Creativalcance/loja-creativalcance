-- Match the public catalogue's display order so LIMIT can stop the scan as
-- soon as enough matching products are found. Previously every active product
-- was searched across up to 40 ILIKE predicates and then sorted.
-- Only active rows participate; product visibility and RLS remain unchanged.
set local lock_timeout = '1s';
set local statement_timeout = '15s';

create index if not exists products_active_display_order_idx
  on public.products (is_purchasable desc, is_featured desc, updated_at desc, id asc)
  where status = 'active' and is_active = true;

-- Rollback: drop index public.products_active_display_order_idx;
