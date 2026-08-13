import Link from "next/link";
import { ArrowLeft, Download, MapPin, Users } from "lucide-react";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import CreateAdminForm from "./CreateAdminForm";
import { updateUserAccessAction } from "./actions";

type Row={id:string;full_name:string|null;email:string;phone:string|null;company_name:string|null;tax_id:string|null;role:"customer"|"admin";is_active:boolean;created_at:string};
type Address={user_id:string;address_type:string;is_default:boolean};

export default async function UsersPage(){
  await assertAdminAccess("/admin/utilizadores");const admin=createSupabaseAdminClient();
  const[profilesResult,addressesResult]=await Promise.all([admin.from("profiles").select("id,full_name,email,phone,company_name,tax_id,role,is_active,created_at").order("created_at",{ascending:false}).returns<Row[]>(),admin.from("customer_addresses").select("user_id,address_type,is_default").returns<Address[]>()]);
  if(profilesResult.error)throw new Error(profilesResult.error.message);if(addressesResult.error)throw new Error(addressesResult.error.message);
  const counts=new Map<string,number>();for(const address of addressesResult.data??[])counts.set(address.user_id,(counts.get(address.user_id)??0)+1);
  return <main className="min-h-screen bg-neutral-950 px-4 py-10 text-white sm:px-6"><section className="mx-auto max-w-7xl">
    <Link href="/admin" className="inline-flex items-center text-sm text-white/60"><ArrowLeft className="mr-2 h-4 w-4"/>Voltar ao dashboard admin</Link>
    <div className="mt-7 flex flex-col gap-5 md:flex-row md:items-end md:justify-between"><div><p className="text-sm uppercase tracking-[.2em] text-white/50">Administração</p><h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Utilizadores e Contas</h1><p className="mt-3 max-w-3xl text-white/60">Contactos, empresas, moradas e permissões das contas registadas.</p></div><Link href="/api/admin/utilizadores/exportar" className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-neutral-950"><Download className="mr-2 h-4 w-4"/>Exportar base de dados CSV</Link></div>
    <div className="mt-8 grid gap-4 sm:grid-cols-2"><article className="rounded-3xl border border-white/10 bg-white/[.03] p-5"><Users className="h-6 w-6"/><p className="mt-4 text-sm text-white/50">Contas</p><p className="mt-1 text-3xl font-semibold">{(profilesResult.data??[]).length}</p></article><article className="rounded-3xl border border-white/10 bg-white/[.03] p-5"><MapPin className="h-6 w-6"/><p className="mt-4 text-sm text-white/50">Moradas guardadas</p><p className="mt-1 text-3xl font-semibold">{(addressesResult.data??[]).length}</p></article></div>
    <div className="mt-8"><CreateAdminForm/></div>
    <div className="mt-8 overflow-x-auto rounded-3xl border border-white/10"><table className="w-full min-w-[950px] text-left text-sm"><thead className="bg-white/5 text-white/60"><tr><th className="p-4">Utilizador</th><th className="p-4">Contacto/empresa</th><th className="p-4">Moradas</th><th className="p-4">Perfil</th><th className="p-4">Estado e ação</th></tr></thead><tbody>{(profilesResult.data??[]).map(row=><tr key={row.id} className="border-t border-white/10"><td className="p-4"><strong>{row.full_name||"Sem nome"}</strong><div className="text-white/50">{row.email}</div></td><td className="p-4"><div>{row.phone||"Sem telefone"}</div><div className="text-white/50">{row.company_name||"Particular"}{row.tax_id?` · NIF ${row.tax_id}`:""}</div></td><td className="p-4">{counts.get(row.id)??0}</td><td className="p-4">{row.role==="admin"?"Admin":"Cliente"}</td><td className="p-4"><form action={updateUserAccessAction} className="flex flex-wrap gap-2"><input type="hidden" name="id" value={row.id}/><select name="role" defaultValue={row.role} className="rounded-lg bg-white px-3 py-2 text-neutral-950"><option value="customer">Cliente</option><option value="admin">Admin</option></select><select name="is_active" defaultValue={String(row.is_active)} className="rounded-lg bg-white px-3 py-2 text-neutral-950"><option value="true">Ativo</option><option value="false">Inativo</option></select><button className="rounded-lg border border-white/20 px-3 py-2 font-semibold">Guardar</button></form></td></tr>)}</tbody></table></div>
  </section></main>;
}
