"use server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AuthActionState } from "@/lib/auth/actions";

export async function updateCustomerDataAction(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "A sessão expirou. Inicia sessão novamente." };
  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  if (!fullName) return { success: false, message: "Indica o nome completo." };
  const { error } = await supabase.from("profiles").update({ full_name: fullName, phone }).eq("id", user.id);
  if (error) return { success: false, message: "Não foi possível guardar os dados." };
  revalidatePath("/area-cliente"); revalidatePath("/area-cliente/dados");
  return { success: true, message: "Dados atualizados com sucesso." };
}
