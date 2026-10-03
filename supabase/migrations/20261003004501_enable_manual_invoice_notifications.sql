-- Apply after deploying support for invoice_required and order_invoice_available.
create trigger queue_order_invoice_emails
after update of status, fulfillment_status, shipped_at, payment_status, invoice_storage_path, invoice_number, invoice_status
on public.orders for each row execute function private.queue_order_invoice_emails();
