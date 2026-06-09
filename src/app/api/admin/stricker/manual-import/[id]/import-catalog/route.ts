import { NextRequest, NextResponse } from "next/server";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { importColorsToCatalog } from "@/lib/stricker/manual-import/import-colors-to-catalog";
import { importProductTypesToCatalog } from "@/lib/stricker/manual-import/import-product-types-to-catalog";
import { importProductsTreeToCatalog } from "@/lib/stricker/manual-import/import-products-tree-to-catalog";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type ManualImportFileRow = {
  id: string;
  dataset_name: string;
};

async function getManualImportFile(
  id: string,
): Promise<ManualImportFileRow | null> {
  const supabaseAdmin = createSupabaseAdminClient();

  const { data, error } = await supabaseAdmin
    .from("supplier_manual_import_files")
    .select("id,dataset_name")
    .eq("id", id)
    .single<ManualImportFileRow>();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function POST(
  _request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    await assertAdminAccess();

    const { id } = await context.params;
    const manualFile = await getManualImportFile(id);

    if (!manualFile) {
      return NextResponse.json(
        {
          success: false,
          message: "Ficheiro de importação manual não encontrado.",
        },
        { status: 404 },
      );
    }

    if (manualFile.dataset_name === "colors") {
      const result = await importColorsToCatalog({
        manualImportFileId: id,
      });

      return NextResponse.json({
        success: true,
        message: "Cores importadas para o catálogo com sucesso.",
        dataset: manualFile.dataset_name,
        ...result,
      });
    }

    if (manualFile.dataset_name === "productTypes") {
      const result = await importProductTypesToCatalog({
        manualImportFileId: id,
      });

      return NextResponse.json({
        success: true,
        message: "Tipos de produto importados para o catálogo com sucesso.",
        dataset: manualFile.dataset_name,
        ...result,
      });
    }

    if (manualFile.dataset_name === "productsTree") {
      const result = await importProductsTreeToCatalog({
        manualImportFileId: id,
      });

      return NextResponse.json({
        success: true,
        message: "Produtos importados para o catálogo com sucesso.",
        dataset: manualFile.dataset_name,
        ...result,
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: `Dataset ainda não suportado para importação para catálogo: ${manualFile.dataset_name}`,
      },
      { status: 400 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao importar para o catálogo.",
      },
      { status: 500 },
    );
  }
}