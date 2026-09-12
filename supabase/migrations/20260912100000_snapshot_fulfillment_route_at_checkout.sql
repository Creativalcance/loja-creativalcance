-- prepare_checkout_order deliberately inserts a fixed column list. A BEFORE
-- INSERT trigger keeps that stable RPC backwards compatible while copying the
-- server-validated cart route into the immutable order line snapshot.
create or replace function public.snapshot_order_item_fulfillment_route()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.source_cart_item_id is not null then
    select ci.fulfillment_route
      into new.fulfillment_route
    from public.cart_items ci
    where ci.id = new.source_cart_item_id
      and ci.cart_id = (select o.source_cart_id from public.orders o where o.id = new.order_id);
  end if;

  new.fulfillment_route := coalesce(new.fulfillment_route, 'supplier_api');
  return new;
end;
$$;

revoke all on function public.snapshot_order_item_fulfillment_route() from public;

drop trigger if exists order_items_snapshot_fulfillment_route on public.order_items;
create trigger order_items_snapshot_fulfillment_route
before insert on public.order_items
for each row execute function public.snapshot_order_item_fulfillment_route();
