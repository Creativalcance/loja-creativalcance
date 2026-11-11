begin;
select set_config('request.jwt.claims','{}',true);
set local role anon;
do $$ begin
 assert exists(select 1 from public.homepage_settings where id='main'),'Published homepage not readable';
 assert not has_column_privilege('anon','public.homepage_settings','updated_by','select'),'Editor identity exposed';
 assert not has_table_privilege('anon','public.homepage_settings','insert'),'Anonymous inserts allowed';
 assert not has_table_privilege('anon','public.homepage_settings','update'),'Anonymous edits allowed';
 assert not has_table_privilege('anon','public.homepage_settings','delete'),'Anonymous deletion allowed';
end $$;
reset role;
set local role authenticated;
do $$ begin
 assert exists(select 1 from public.homepage_settings where id='main'),'Customer cannot see published homepage';
 assert not has_table_privilege('authenticated','public.homepage_settings','update'),'Customer edits allowed';
 assert not has_table_privilege('authenticated','public.homepage_settings','insert'),'Customer inserts allowed';
 assert not has_table_privilege('authenticated','public.homepage_settings','delete'),'Customer deletion allowed';
end $$;
reset role;
set local role service_role;
do $$ declare old_version integer; changed integer; rejected boolean:=false; begin
 select version into old_version from public.homepage_settings where id='main';
 update public.homepage_settings set version=old_version+1 where id='main' and version=old_version;
 get diagnostics changed=row_count; assert changed=1,'Admin update failed';
 update public.homepage_settings set version=old_version+1 where id='main' and version=old_version;
 get diagnostics changed=row_count; assert changed=0,'Concurrent update overwrote settings';
 begin update public.homepage_settings set config='{}' where id='main';exception when check_violation then rejected:=true;end;
 assert rejected,'Malformed config accepted';
end $$;
reset role;
rollback;
select 'PASS: public read, restricted editor data, denied customer writes, admin update, version guard and config constraint' as result;
