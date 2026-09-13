begin;
do $$
declare
  u uuid := gen_random_uuid();
  other_user uuid := gen_random_uuid();
  p uuid;
  guest uuid;
  second_guest uuid;
  item uuid;
  draft uuid;
  result uuid;
  token text := gen_random_uuid()::text;
  second_token text := gen_random_uuid()::text;
begin
  insert into auth.users(id,email) values (u,u::text || '@example.invalid'),(other_user,other_user::text || '@example.invalid');
  select id into p from products limit 1;
  insert into carts(session_id) values(token) returning id into guest;
  insert into product_customization_drafts(product_id,session_id,personalization_data)
    values(p,token,'{"test":"artwork-preserved"}') returning id into draft;
  insert into cart_items(cart_id,product_id,product_sku,product_name,quantity,unit_price,subtotal,total,customization_draft_id)
    values(guest,p,'TEST','Login regression',10,2,20,20,draft) returning id into item;
  result := claim_guest_shopping(u,token);
  assert result = guest, 'Guest cart was not adopted';
  assert (select user_id = u and session_id is null from carts where id = guest), 'Wrong cart ownership';
  assert (select user_id = u and session_id is null and personalization_data->>'test' = 'artwork-preserved'
    from product_customization_drafts where id = draft), 'Draft lost';

  insert into carts(session_id) values(second_token) returning id into second_guest;
  insert into cart_items(cart_id,product_id,product_sku,product_name,quantity,unit_price,subtotal,total,personalization_data)
    values(second_guest,p,'TEST','Distinct artwork',5,3,15,15,'{"test":"different"}');
  result := claim_guest_shopping(u,second_token);
  assert result = guest, 'Existing cart was replaced';
  assert (select count(*) = 2 from cart_items where cart_id = guest), 'Lines lost during merge';
  assert (select grand_total = 35 from carts where id = guest), 'Totals incorrect';
  assert (select customization_draft_id = draft from cart_items where id = item), 'Artwork link lost';
  perform claim_guest_shopping(u,second_token);
  assert (select count(*) = 2 from cart_items where cart_id = guest), 'Repeated login duplicated lines';
  perform claim_guest_shopping(other_user,token);
  assert (select user_id = u from carts where id = guest), 'Another account claimed cart';
  assert (select user_id = u from product_customization_drafts where id = draft), 'Another account claimed draft';
  assert not has_function_privilege('anon','public.claim_guest_shopping(uuid,text)','execute'), 'Anonymous RPC access';
  assert not has_function_privilege('authenticated','public.claim_guest_shopping(uuid,text)','execute'), 'Client RPC access';
end;
$$;
rollback;
select 'PASS: adoption, merge, artwork, totals, idempotency, isolation and RPC permissions; rolled back' as result;
