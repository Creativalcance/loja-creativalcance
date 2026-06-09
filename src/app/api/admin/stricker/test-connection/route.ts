import { NextResponse } from "next/server";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { getValidStrickerSessionToken } from "@/lib/stricker/auth";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    await assertAdminAccess();

    const token = await getValidStrickerSessionToken();

    return NextResponse.json({
      success: true,
      message: "Ligação Stricker validada com sucesso.",
      token_preview: `${token.slice(0, 6)}...${token.slice(-6)}`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao testar ligação Stricker.",
      },
      {
        status: 500,
      },
    );
  }
}