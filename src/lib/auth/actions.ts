"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthActionState = {
  success: boolean;
  message: string;
};

export async function loginAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return {
      success: false,
      message: "Preenche o e-mail e a palavra-passe.",
    };
  }

  try {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        success: false,
        message: "Dados de acesso inválidos.",
      };
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

  redirect("/admin");
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