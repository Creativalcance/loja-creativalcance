import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Profile = { id:string;full_name:string|null;email:string;phone:string|null;company_name:string|null;tax_id:string|null;billing_email:string|null;role:string;is_active:boolean;created_at:string };
type Address = { user_id:string;address_type:string;label:string|null;company_name:string|null;tax_id:string|null;contact_name:string|null;contact_email:string|null;contact_phone:string|null;address_line_1:string;address_line_2:string|null;postal_code:string;city:string;district:string|null;country_code:string;is_default:boolean };

function csv(value:unknown):string { const text=value===null||value===undefined?"":String(value); return `"${text.replaceAll('"','""')}"`; }

export async function GET():Promise<Response>{
  await assertAdminAccess("/admin/utilizadores");
  const admin=createSupabaseAdminClient();
  const[profilesResult,addressesResult]=await Promise.all([
    admin.from("profiles").select("id,full_name,email,phone,company_name,tax_id,billing_email,role,is_active,created_at").order("created_at",{ascending:false}).returns<Profile[]>(),
    admin.from("customer_addresses").select("user_id,address_type,label,company_name,tax_id,contact_name,contact_email,contact_phone,address_line_1,address_line_2,postal_code,city,district,country_code,is_default").order("user_id").returns<Address[]>(),
  ]);
  if(profilesResult.error)throw new Error(profilesResult.error.message);if(addressesResult.error)throw new Error(addressesResult.error.message);
  const addressesByUser=new Map<string,Address[]>();for(const address of addressesResult.data??[]){const list=addressesByUser.get(address.user_id)??[];list.push(address);addressesByUser.set(address.user_id,list);}
  const header=["Nome","Email","Telefone","Empresa","NIF","Email faturação","Perfil","Estado","Criado em","Tipo morada","Etiqueta","Contacto morada","Email morada","Telefone morada","Morada 1","Morada 2","Código postal","Localidade","Distrito","País","Preferida"];
  const rows:string[][]=[header];for(const profile of profilesResult.data??[]){const addresses=addressesByUser.get(profile.id)??[null];for(const address of addresses){rows.push([profile.full_name??"",profile.email,profile.phone??"",profile.company_name??"",profile.tax_id??"",profile.billing_email??"",profile.role,profile.is_active?"Ativo":"Inativo",profile.created_at,address?.address_type??"",address?.label??"",address?.contact_name??"",address?.contact_email??"",address?.contact_phone??"",address?.address_line_1??"",address?.address_line_2??"",address?.postal_code??"",address?.city??"",address?.district??"",address?.country_code??"",address?.is_default?"Sim":"Não"]);}}
  const content="\uFEFF"+rows.map(row=>row.map(csv).join(";")).join("\r\n");
  return new Response(content,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":`attachment; filename="utilizadores-contas-${new Date().toISOString().slice(0,10)}.csv"`,"Cache-Control":"no-store"}});
}

