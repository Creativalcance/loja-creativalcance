"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AuthActionState } from "@/lib/auth/actions";
import { authActionMessages } from "@/lib/i18n/account";
import { getSiteLocale, localizePath } from "@/lib/i18n/config";

export async function requestPasswordResetAction(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const locale = getSiteLocale(String(formData.get("locale") || "pt")); const messages = authActionMessages(locale);
  if (!email) return { success: false, message: messages.emailRequired };

  const supabase = await createSupabaseServerClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(localizePath("/nova-password", locale))}`,
  });

  return { success: true, message: messages.resetSent };
}
