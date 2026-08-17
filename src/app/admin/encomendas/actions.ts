"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function deleteAdminOrderAction(formData:FormData):Promise<void>{
  const access=await assertAdminAccess("/admin/encomendas");const orderId=String(formData.get("orderId")??"").trim();if(!orderId)throw new Error("Encomenda inválida.");
  const admin=createSupabaseAdminClient();const{data:order,error:findError}=await admin.from("orders").select("id,status,order_number,payment_status,supplier_submission_status").eq("id",orderId).is("deleted_at",null).maybeSingle<{id:string;status:string;order_number:string;payment_status:string;supplier_submission_status:string}>();if(findError||!order)throw new Error(findError?.message??"Encomenda não encontrada.");
  if(order.payment_status==="paid"||!["not_submitted","failed"].includes(order.supplier_submission_status))throw new Error("Uma encomenda paga ou já enviada ao fornecedor não pode ser eliminada.");
  const now=new Date().toISOString();const{error}=await admin.from("orders").update({deleted_at:now,deleted_by:access.userId,status:"cancelled",cancelled_at:now}).eq("id",order.id);if(error)throw new Error(error.message);
  await admin.from("order_status_history").insert({order_id:order.id,previous_status:order.status,new_status:"cancelled",changed_by:access.userId,notes:`Encomenda ${order.order_number} eliminada pelo administrador.`,metadata:{action:"soft_delete",deletedAt:now}});
  revalidatePath("/admin/encomendas");redirect("/admin/encomendas?sucesso=encomenda-eliminada");
}
