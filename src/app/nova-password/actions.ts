"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AuthActionState } from "@/lib/auth/actions";
import { authActionMessages } from "@/lib/i18n/account";
import { getSiteLocale } from "@/lib/i18n/config";

export async function updatePasswordAction(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");
  const locale = getSiteLocale(String(formData.get("locale") || "pt")); const messages = authActionMessages(locale);
  const hasMinimumLength = password.length >= 8;
  const hasLetter = /\p{L}/u.test(password);
  const hasNumber = /\d/.test(password);
  if (!hasMinimumLength || !hasLetter || !hasNumber) {
    return {
      success: false,
      message: messages.passwordRule,
    };
  }
  if (password !== confirmation) return { success: false, message: messages.mismatch };
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: messages.expired };
  const { error } = await supabase.auth.updateUser({ password });
  return error ? { success: false, message: messages.updateFailed } : { success: true, message: messages.updateSuccess };
}
