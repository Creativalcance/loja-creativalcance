"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

function getDefaultRedirectPath(role: string | null | undefined): string {
  if (role === "admin") {
    return "/admin";
  }

  return "/area-cliente";
}

function canUseRequestedPath(role: string | null | undefined, path: string): boolean {
  if (path.startsWith("/admin") || path.startsWith("/area-comercial")) {
    return role === "admin";
  }

  if (path.startsWith("/area-cliente")) {
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
  const requestedNextPath = getSafeRedirectPath(formData.get("next"));
  let destinationPath = requestedNextPath;

  if (!email || !password) {
    return {
      success: false,
      message: "Preenche o e-mail e a palavra-passe.",
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
        message: "Dados de acesso inválidos.",
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
        return { success: false, message: "Esta conta está inativa. Contacta o apoio ao cliente." };
      }

      if (!destinationPath || !canUseRequestedPath(profile.role, destinationPath)) {
        destinationPath = getDefaultRedirectPath(profile.role);
      }
    }
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? `Erro ao iniciar sessão: ${error.message}`
          : "Erro inesperado ao iniciar sessão.",
    };
  }

  redirect(destinationPath ?? "/area-cliente");
}

export async function registerAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const fullName = String(formData.get("fullName") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (!fullName || !email || !password || !confirmPassword) {
    return {
      success: false,
      message: "Preenche todos os campos.",
    };
  }

  if (password.length < 8) {
    return {
      success: false,
      message: "A palavra-passe deve ter pelo menos 8 caracteres.",
    };
  }

  if (password !== confirmPassword) {
    return {
      success: false,
      message: "As palavras-passe não coincidem.",
    };
  }

  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback?next=/area-cliente`,
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      return {
        success: false,
        message: `Erro ao criar conta: ${error.message}`,
      };
    }

    if (!data.user) {
      return {
        success: false,
        message: "Não foi possível criar a conta. Tenta novamente.",
      };
    }

    return {
      success: true,
      message:
        "Conta criada com sucesso. Se a confirmação por e-mail estiver activa, confirma o e-mail antes de iniciar sessão.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? `Erro técnico ao criar conta: ${error.message}`
          : "Erro técnico inesperado ao criar conta.",
    };
  }
}
