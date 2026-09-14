"use server";
import { revalidatePath } from "next/cache";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AuthActionState } from "@/lib/auth/actions";

export async function createAdminAction(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  await assertAdminAccess("/admin/utilizadores");
  const fullName=String(formData.get("full_name")??"").trim();const email=String(formData.get("email")??"").trim().toLowerCase();const password=String(formData.get("password")??"");
  if(!fullName||!email||password.length<8)return{success:false,message:"Preenche nome, e-mail e uma palavra-passe com pelo menos 8 caracteres."};
  const admin=createSupabaseAdminClient();
  const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:fullName}});
  if(error||!data.user)return{success:false,message:error?.message??"Não foi possível criar o Admin."};
  const {error:profileError}=await admin.from("profiles").upsert({id:data.user.id,email,full_name:fullName,role:"admin",is_active:true});
  if(profileError){await admin.auth.admin.deleteUser(data.user.id);return{success:false,message:"A conta não foi criada porque o perfil falhou."};}
  revalidatePath("/admin/utilizadores");return{success:true,message:"Admin criado com sucesso."};
}

export async function updateUserAccessAction(formData: FormData): Promise<void> {
  const {userId:current}=await assertAdminAccess("/admin/utilizadores");
  const id=String(formData.get("id")??"");const role=String(formData.get("role")??"");const active=String(formData.get("is_active")??"")==="true";
  if(!id||!(["customer","admin"] as string[]).includes(role))return;
  if(id===current&&(!active||role!=="admin"))throw new Error("Não podes retirar o teu próprio acesso de Administração.");
  const admin=createSupabaseAdminClient();const{error}=await admin.from("profiles").update({role,is_active:active}).eq("id",id);if(error)throw new Error(error.message);revalidatePath("/admin/utilizadores");
}
