import { NextRequest, NextResponse } from "next/server";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { importProductsTreeToCatalog } from "@/lib/stricker/manual-import/import-products-tree-to-catalog";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  _request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    await assertAdminAccess();

    const { id } = await context.params;

    const result = await importProductsTreeToCatalog({
      manualImportFileId: id,
    });

    return NextResponse.json({
      success: true,
      message: "Produtos importados para o catálogo com sucesso.",
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao importar produtos para o catálogo.",
      },
      { status: 500 },
    );
  }
}