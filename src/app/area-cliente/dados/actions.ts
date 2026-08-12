"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CustomerDataState = { success: boolean; message: string };
const value = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
const optional = (data: FormData, key: string) => value(data, key) || null;

async function authenticatedClient() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

function refreshAccount() {
  revalidatePath("/area-cliente");
  revalidatePath("/area-cliente/dados");
  revalidatePath("/checkout");
}

export async function updateCustomerDataAction(_state: CustomerDataState, formData: FormData): Promise<CustomerDataState> {
  const { supabase, user } = await authenticatedClient();
  if (!user) return { success: false, message: "A sessão expirou. Inicia sessão novamente." };
  const fullName = value(formData, "full_name");
  if (!fullName) return { success: false, message: "Indica o nome completo." };
  const taxId = value(formData, "tax_id").replace(/\s+/g, "").replace(/^PT/i, "") || null;
  const billingEmail = optional(formData, "billing_email");
  if (billingEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billingEmail)) return { success: false, message: "Indica um e-mail de faturação válido." };
  const { error } = await supabase.from("profiles").update({
    full_name: fullName, phone: optional(formData, "phone"), company_name: optional(formData, "company_name"), tax_id: taxId, billing_email: billingEmail,
  }).eq("id", user.id);
  if (error) return { success: false, message: "Não foi possível guardar os dados da conta." };
  refreshAccount();
  return { success: true, message: "Dados da conta atualizados com sucesso." };
}

export async function addCustomerAddressAction(_state: CustomerDataState, formData: FormData): Promise<CustomerDataState> {
  const { supabase, user } = await authenticatedClient();
  if (!user) return { success: false, message: "A sessão expirou. Inicia sessão novamente." };
  const addressType = value(formData, "address_type") === "billing" ? "billing" : "shipping";
  if (["contact_name", "address_line_1", "postal_code", "city"].some((key) => !value(formData, key))) return { success: false, message: "Preenche os campos obrigatórios da morada." };
  const { count } = await supabase.from("customer_addresses").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("address_type", addressType);
  const makeDefault = formData.get("is_default") === "on" || (count ?? 0) === 0;
  if (makeDefault) {
    const { error } = await supabase.from("customer_addresses").update({ is_default: false }).eq("user_id", user.id).eq("address_type", addressType);
    if (error) return { success: false, message: "Não foi possível atualizar a morada preferida." };
  }
  const { error } = await supabase.from("customer_addresses").insert({
    user_id: user.id, address_type: addressType, label: optional(formData, "label"), company_name: optional(formData, "company_name"),
    tax_id: optional(formData, "tax_id")?.replace(/\s+/g, "").replace(/^PT/i, "") ?? null, contact_name: value(formData, "contact_name"),
    contact_email: optional(formData, "contact_email"), contact_phone: optional(formData, "contact_phone"), address_line_1: value(formData, "address_line_1"),
    address_line_2: optional(formData, "address_line_2"), postal_code: value(formData, "postal_code").toUpperCase(), city: value(formData, "city"),
    district: optional(formData, "district"), country_code: "PT", is_default: makeDefault,
  });
  if (error) return { success: false, message: "Não foi possível guardar a morada." };
  refreshAccount();
  return { success: true, message: addressType === "billing" ? "Morada de faturação guardada." : "Morada de entrega guardada." };
}

export async function setPreferredAddressAction(formData: FormData) {
  const { supabase, user } = await authenticatedClient();
  if (!user) return;
  const id = value(formData, "id");
  const type = value(formData, "address_type") === "billing" ? "billing" : "shipping";
  await supabase.from("customer_addresses").update({ is_default: false }).eq("user_id", user.id).eq("address_type", type);
  await supabase.from("customer_addresses").update({ is_default: true }).eq("id", id).eq("user_id", user.id).eq("address_type", type);
  refreshAccount();
}

export async function deleteCustomerAddressAction(formData: FormData) {
  const { supabase, user } = await authenticatedClient();
  if (!user) return;
  const id = value(formData, "id");
  const type = value(formData, "address_type") === "billing" ? "billing" : "shipping";
  const { data: deleted } = await supabase.from("customer_addresses").delete().eq("id", id).eq("user_id", user.id).select("is_default").maybeSingle<{ is_default: boolean }>();
  if (deleted?.is_default) {
    const { data: next } = await supabase.from("customer_addresses").select("id").eq("user_id", user.id).eq("address_type", type).order("created_at", { ascending: false }).limit(1).maybeSingle<{ id: string }>();
    if (next) await supabase.from("customer_addresses").update({ is_default: true }).eq("id", next.id);
  }
  refreshAccount();
}
