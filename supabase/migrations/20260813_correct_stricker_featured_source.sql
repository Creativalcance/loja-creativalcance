-- O destaque base pertence à Stricker (campo Novelties).
-- featured_override só é preenchido quando um administrador toma uma decisão manual.
create or replace function public.preserve_product_featured_override()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.featured_override is not null then
      new.is_featured := new.featured_override;
    end if;
  elsif old.featured_override is not null
    and new.featured_override is not distinct from old.featured_override then
    new.featured_override := old.featured_override;
    new.is_featured := old.featured_override;
  elsif new.featured_override is not null then
    new.is_featured := new.featured_override;
  end if;

  return new;
end;
$$;

-- Repor apenas produtos sem escolha manual, usando o valor original da Stricker.
update public.products
set is_featured = case
  when lower(coalesce(supplier_payload ->> 'Novelties', 'false')) in ('true', '1', 'yes', 'sim', 's') then true
  else false
end
where featured_override is null;
