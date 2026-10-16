-- Avoid dangling descriptive clauses in draft commercial names.
create or replace function private.commercial_name_descriptor(source text, lang text) returns text
language plpgsql immutable set search_path='' as $$
declare result text; separator text;
begin
  if source is null or btrim(source)='' then return null; end if;
  result := regexp_replace(source, '<[^>]*>', '', 'g');
  -- Supplier titles conventionally start with MODEL. Description.
  result := regexp_replace(result, '^[^.]{1,100}\.\s+', '');
  result := regexp_replace(result, '\s+', ' ', 'g');
  separator := case lang when 'pt' then ' (em|com) ' when 'en' then ' (in|with|made of) '
    when 'fr' then ' (en|avec) ' when 'es' then ' (en|con) ' when 'de' then ' (aus|mit) '
    when 'it' then ' (in|con) ' else ' with ' end;
  result := btrim((regexp_split_to_array(result, separator, 'i'))[1]);
  result := btrim(split_part(result, ', ', 1));
  if lang='pt' then result := regexp_replace(result, '^Conjunto composto por (uma |um )?', 'Conjunto de ', 'i'); end if;
  if length(result)>120 then result := regexp_replace(left(result,120),'\s+\S*$',''); end if;
  return nullif(result,'');
end;
$$;
