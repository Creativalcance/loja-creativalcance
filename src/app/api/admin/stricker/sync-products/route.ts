import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type ProfileResponse = {
  role: string;
};

type EdgeFunctionResponse = {
  success?: boolean;
  supplierId?: string;
  syncBatchId?: string;
  totalRecords?: number;
  successfulRecords?: number;
  failedRecords?: number;
  message?: string;
};

function getSupabaseFunctionUrl(functionName: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL não está configurado.");
  }

  return `${supabaseUrl}/functions/v1/${functionName}`;
}

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          message: "Sessão inválida. É necessário iniciar sessão.",
        },
        { status: 401 },
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single<ProfileResponse>();

    if (profileError || !profile) {
      return NextResponse.json(
        {
          success: false,
          message: "Perfil de utilizador não encontrado.",
        },
        { status: 403 },
      );
    }

    if (!["admin", "super_admin", "sales"].includes(profile.role)) {
      return NextResponse.json(
        {
          success: false,
          message: "Não tem permissões para iniciar sincronizações.",
        },
        { status: 403 },
      );
    }

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      return NextResponse.json(
        {
          success: false,
          message: "Não foi possível obter o token da sessão atual.",
        },
        { status: 401 },
      );
    }

    const response = await fetch(
      getSupabaseFunctionUrl("stricker-sync-products"),
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      },
    );

    const data = (await response.json()) as EdgeFunctionResponse;

    if (!response.ok || data.success === false) {
      return NextResponse.json(
        {
          success: false,
          message:
            data.message ||
            "A Edge Function de sincronização devolveu um erro.",
          totalRecords: data.totalRecords,
          successfulRecords: data.successfulRecords,
          failedRecords: data.failedRecords,
        },
        { status: response.status },
      );
    }

    return NextResponse.json({
      success: true,
      message: data.message || "Sincronização iniciada com sucesso.",
      supplierId: data.supplierId,
      syncBatchId: data.syncBatchId,
      totalRecords: data.totalRecords,
      successfulRecords: data.successfulRecords,
      failedRecords: data.failedRecords,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao iniciar sincronização Stricker.",
      },
      { status: 500 },
    );
  }
}