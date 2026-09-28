-- Money and payment state are written only by authenticated server actions and
-- webhooks using service_role. Keep SELECT and all existing ownership RLS rules.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
ON public.carts, public.cart_items, public.product_customization_drafts,
   public.orders, public.order_items, public.payments, public.checkout_sessions
FROM anon, authenticated;

ALTER FUNCTION public.set_products_search_vector() SET search_path = pg_catalog, public;
ALTER FUNCTION public.generate_order_number() SET search_path = pg_catalog, public;
ALTER FUNCTION public.set_order_number() SET search_path = pg_catalog, public;
ALTER FUNCTION public.set_pricing_rules_updated_at() SET search_path = pg_catalog, public;
ALTER FUNCTION public.set_supplier_order_events_updated_at() SET search_path = pg_catalog, public;
ALTER FUNCTION public.enforce_product_minimum_order_quantity() SET search_path = pg_catalog, public;
ALTER FUNCTION public.compact_product_customization_option_raw_payload() SET search_path = pg_catalog, public;
