create or replace function public.generate_commercial_name_drafts(p_limit integer default 100) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare
  row record; lang text; source_name text; descriptor text; model text; full_name text;
  result jsonb; complete boolean; generated integer := 0; skipped integer := 0; incomplete integer := 0;
  roots text[] := array['Arco','Nexo','Pulso','Rumo','Traço','Linha','Lume','Vértice','Prisma','Eixo','Vela','Maré','Brisa','Norte','Sul','Poente','Nascente','Estela','Atlas','Pórtico','Nimbo','Cais','Ria','Duna','Orla','Cume','Vale','Cedro','Lira','Alva','Aurora','Senda','Mira','Vento','Onda','Delta','Aris','Íris','Lago','Nave','Trama','Verso','Fio','Laço','Plano','Roda','Elo','Aria','Terra','Raiz','Alto','Monte','Serra','Largo','Praia','Rio','Nora','Vila','Domo','Lótus','Junco','Trevo','Sal','Âmbar','Coral','Jaspe','Quartzo','Sílex','Ágata','Opala'];
  themes text[] := array['Alva','Lira','Orla','Ria','Mira','Nora','Aris','Duna','Estela','Cais','Vale','Cume','Nave','Senda','Vila','Nimbo','Delta','Íris','Aria','Lago','Vela','Aurora','Atlas','Domo','Elo','Cedro','Junco','Trevo','Lótus','Coral','Jaspe','Sílex','Ágata','Opala','Âmbar','Terra','Raiz','Maré','Onda','Brisa','Vento','Serra','Monte','Praia','Rio','Sal','Largo','Norte','Sul','Poente','Nascente','Pórtico','Trama','Verso','Fio','Laço','Plano','Roda','Prisma','Eixo','Arco','Pulso','Rumo','Traço','Linha','Lume','Nexo','Vértice','Alto','Quartzo'];
begin
  if p_limit<1 or p_limit>200 then raise exception 'Invalid batch size'; end if;
  for row in select i.product_id,i.model_index,i.translations,i.review_status,i.naming_status,i.generated_version,i.version,p.sku,p.name
    from public.product_commercial_identities i join public.products p on p.id=i.product_id
    where (i.naming_status='pending' or (i.naming_status='needs_review' and i.version=i.generated_version and i.review_status='draft')) and p.deleted_at is null
    order by (i.naming_status='pending') desc,i.updated_at,i.model_index limit p_limit for update of i skip locked
  loop
    -- Any prior human edit wins; never replace it with generated text.
    if (row.naming_status='pending' and row.translations <> '{}'::jsonb) or row.review_status <> 'draft' then
      update public.product_commercial_identities set naming_status='needs_review' where product_id=row.product_id;
      skipped := skipped+1; continue;
    end if;
    model := roots[((row.model_index-1)%70+1)::integer] || ' ' || themes[(((row.model_index-1)/70)%70+1)::integer];
    if roots[((row.model_index-1)%70+1)::integer] = themes[(((row.model_index-1)/70)%70+1)::integer] then model := roots[((row.model_index-1)%70+1)::integer]; end if;
    if row.model_index>4900 then model := model || ' ' || (((row.model_index-1)/4900)+1)::text; end if;
    model := case row.sku when '93669' then 'Horizonte' when '96059' then 'Ritmo'
      when '54267' then 'Órbita' when '34048' then 'Circuito' when '73120' then 'Ponto' else model end;
    result := row.translations; complete := true;
    foreach lang in array array['pt','en','fr','es','de','it'] loop
      if coalesce(btrim(result->lang->>'name'),'') <> '' then continue; end if;
      source_name := null;
      if lang='pt' then source_name := row.name;
      else select t.name into source_name from public.product_translations t where t.product_id=row.product_id and t.language=upper(lang) limit 1; end if;
      descriptor := private.commercial_name_descriptor(source_name,lang);
      if row.sku='93669' then descriptor := (array['Bloco de notas','Notebook','Carnet de notes','Bloc de notas','Notizbuch','Taccuino'])[array_position(array['pt','en','fr','es','de','it'],lang)];
      elsif row.sku='96059' then descriptor := (array['Agenda A5','A5 diary','Agenda A5','Agenda A5','A5-Terminplaner','Agenda A5'])[array_position(array['pt','en','fr','es','de','it'],lang)];
      elsif row.sku='54267' then descriptor := (array['Copo térmico','Thermal tumbler','Gobelet isotherme','Vaso térmico','Thermobecher','Bicchiere termico'])[array_position(array['pt','en','fr','es','de','it'],lang)];
      elsif row.sku='34048' then descriptor := (array['Saco de compras','Shopping bag','Sac de courses','Bolsa de compras','Einkaufstasche','Borsa per la spesa'])[array_position(array['pt','en','fr','es','de','it'],lang)];
      elsif row.sku='73120' then descriptor := (array['Pin redondo','Round pin badge','Badge rond','Chapa redonda','Runder Ansteckbutton','Spilla rotonda'])[array_position(array['pt','en','fr','es','de','it'],lang)]; end if;
      if descriptor = row.sku then descriptor := null; end if;
      if descriptor is null then full_name := ''; complete := false;
      else full_name := descriptor || ' ' || model || ' 360' || case when row.sku='54267' then ' — 540 mL' else '' end; end if;
      result := result || jsonb_build_object(lang,jsonb_build_object('name',full_name,'description',''));
    end loop;
    -- Missing translations may be retried; do not write identical drafts or grow audit history.
    if result is not distinct from row.translations and row.naming_status = (case when complete then 'generated' else 'needs_review' end) then
      continue;
    end if;
    update public.product_commercial_identities set translations=result, generated_version=version+1,
      naming_status=case when complete then 'generated' else 'needs_review' end
      where product_id=row.product_id;
    generated := generated+1;
    if not complete then incomplete := incomplete+1; end if;
  end loop;
  return jsonb_build_object('generated',generated,'preserved',skipped,'missing_translations',incomplete);
end;
$$;
