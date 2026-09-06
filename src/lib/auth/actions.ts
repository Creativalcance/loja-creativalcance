"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { authActionMessages } from "@/lib/i18n/account";
import { getSiteLocale, localizePath, type SiteLocale } from "@/lib/i18n/config";

export type AuthActionState = {
  success: boolean;
  message: string;
};

type ProfileRole = {
  role: string;
};

function getSafeRedirectPath(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed.startsWith("/")) {
    return null;
  }

  if (trimmed.startsWith("//")) {
    return null;
  }

  if (trimmed.includes("://")) {
    return null;
  }

  return trimmed || null;
}

function getDefaultRedirectPath(role: string | null | undefined, locale: SiteLocale): string {
  if (role === "admin") {
    return "/admin";
  }

  return localizePath("/area-cliente", locale);
}

function canUseRequestedPath(role: string | null | undefined, path: string): boolean {
  const normalizedPath = path.replace(/^\/(?:en|fr)(?=\/|$)/, "") || "/";
  if (normalizedPath.startsWith("/admin") || normalizedPath.startsWith("/area-comercial")) {
    return role === "admin";
  }

  if (normalizedPath.startsWith("/area-cliente")) {
    return role === "customer";
  }

  return true;
}

export async function loginAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const locale = getSiteLocale(String(formData.get("locale") || "pt"));
  const messages = authActionMessages(locale);
  const requestedNextPath = getSafeRedirectPath(formData.get("next"));
  let destinationPath = requestedNextPath;

  if (!email || !password) {
    return {
      success: false,
      message: messages.loginRequired,
    };
  }

  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        success: false,
        message: messages.invalid,
      };
    }

    {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, is_active")
        .eq("id", data.user.id)
        .maybeSingle<ProfileRole & { is_active: boolean }>();

      if (!profile || profile.is_active === false) {
        await supabase.auth.signOut();
        return { success: false, message: messages.inactive };
      }

      if (!destinationPath || !canUseRequestedPath(profile.role, destinationPath)) {
        destinationPath = getDefaultRedirectPath(profile.role, locale);
      }
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? `${messages.unexpectedLogin} ${error.message}` : messages.unexpectedLogin,
    };
  }

  redirect(destinationPath ?? localizePath("/area-cliente", locale));
}

export async function registerAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const fullName = String(formData.get("fullName") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");
  const locale = getSiteLocale(String(formData.get("locale") || "pt"));
  const messages = authActionMessages(locale);

  if (!fullName || !email || !password || !confirmPassword) {
    return {
      success: false,
      message: messages.required,
    };
  }

  const hasMinimumLength = password.length >= 8;
  const hasLetter = /\p{L}/u.test(password);
  const hasNumber = /\d/.test(password);

  if (!hasMinimumLength || !hasLetter || !hasNumber) {
    return {
      success: false,
      message: messages.passwordRule,
    };
  }

  if (password !== confirmPassword) {
    return {
      success: false,
      message: messages.mismatch,
    };
  }

  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback?next=${encodeURIComponent(localizePath("/area-cliente", locale))}`,
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      return {
        success: false,
        message: `${messages.createFailed} ${error.message}`,
      };
    }

    if (!data.user) {
      return {
        success: false,
        message: messages.createFailed,
      };
    }

  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? `${messages.unexpectedCreate} ${error.message}` : messages.unexpectedCreate,
    };
  }

  redirect(`${localizePath("/login", locale)}?registo=sucesso`);
}
