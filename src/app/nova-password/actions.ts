"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AuthActionState } from "@/lib/auth/actions";

export async function updatePasswordAction(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");
  if (password.length < 8) return { success: false, message: "A palavra-passe deve ter pelo menos 8 caracteres." };
  if (password !== confirmation) return { success: false, message: "As palavras-passe não coincidem." };
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "A ligação expirou. Solicita uma nova recuperação." };
  const { error } = await supabase.auth.updateUser({ password });
  return error ? { success: false, message: "Não foi possível alterar a palavra-passe." } : { success: true, message: "Palavra-passe alterada com sucesso. Já podes continuar." };
}
