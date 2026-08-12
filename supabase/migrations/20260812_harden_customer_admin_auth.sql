begin;

drop policy if exists products_sales_admin_select_all on public.products;
drop function if exists public.is_sales_or_admin();
drop function if exists public.current_user_role();

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

commit;
