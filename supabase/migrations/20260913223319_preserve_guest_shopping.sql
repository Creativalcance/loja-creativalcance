-- Invoked only by the server after verifying the signed-in user and guest cookie.
create or replace function public.claim_guest_shopping(p_user_id uuid, p_session_id text)
returns uuid language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  v_target uuid;
  v_guest public.carts%rowtype;
  v_changed boolean := false;
begin
  if p_user_id is null or p_session_id is null or length(p_session_id) < 16 then
    raise exception 'Invalid shopping identity';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('shopping-user:' || p_user_id::text, 0));
  perform pg_advisory_xact_lock(hashtextextended('shopping-session:' || p_session_id, 0));
  select id into v_target from public.carts
    where user_id = p_user_id and status = 'active'
    order by created_at, id limit 1 for update;

  for v_guest in select * from public.carts
    where user_id is null and session_id = p_session_id and status = 'active'
    order by created_at, id for update
  loop
    if v_target is null then
      update public.carts set user_id = p_user_id, session_id = null where id = v_guest.id;
      v_target := v_guest.id;
    else
      if v_guest.currency <> (select currency from public.carts where id = v_target) then
        raise exception 'Cart currencies do not match';
      end if;
      -- Move intact rows: distinct artwork/variants must never be collapsed.
      update public.cart_items set cart_id = v_target where cart_id = v_guest.id;
      update public.carts set status = 'abandoned', user_id = p_user_id, session_id = null
        where id = v_guest.id;
    end if;
    v_changed := true;
  end loop;

  update public.product_customization_drafts set user_id = p_user_id, session_id = null
    where user_id is null and session_id = p_session_id;

  if v_changed then
    update public.carts c set
      subtotal = t.subtotal, personalization_total = t.personalization_total,
      setup_total = t.setup_total, shipping_total = 0, tax_total = 0,
      grand_total = greatest(0, t.total - c.discount_total),
      shipping_method = null, shipping_completed_at = null,
      checkout_step = case when c.shipping_address_id is null then 'destination' else 'shipping' end,
      updated_at = now()
    from (select coalesce(sum(subtotal),0) subtotal,
      coalesce(sum(personalization_total),0) personalization_total,
      coalesce(sum(setup_cost + coalesce(extras_total,0)),0) setup_total,
      coalesce(sum(total),0) total from public.cart_items where cart_id = v_target) t
    where c.id = v_target;
  end if;
  return v_target;
end;
$$;
revoke all on function public.claim_guest_shopping(uuid,text) from public, anon, authenticated;
grant execute on function public.claim_guest_shopping(uuid,text) to service_role;
