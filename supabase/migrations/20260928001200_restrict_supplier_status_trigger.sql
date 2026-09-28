-- Trigger executes through supplier service events; clients must not call it directly.
REVOKE EXECUTE ON FUNCTION public.sync_order_status_from_supplier_service_event() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_order_status_from_supplier_service_event() TO service_role;
