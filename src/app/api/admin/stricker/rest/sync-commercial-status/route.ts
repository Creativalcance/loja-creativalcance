import { NextRequest, NextResponse } from "next/server";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import {
  reconcileCommercialAvailability,
  syncCommercialDataset,
} from "@/lib/stricker/rest/sync-commercial-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type CommercialAction =
  | "canceledProducts"
  | "restrictedProducts"
  | "reconcileAvailability";

const ALLOWED_ACTIONS: CommercialAction[] = [
  "canceledProducts",
  "restrictedProducts",
  "reconcileAvailability",
];

function isAllowedAction(value: string): value is CommercialAction {
  return ALLOWED_ACTIONS.includes(value as CommercialAction);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await assertAdminAccess();

    const body = (await request.json().catch(() => ({}))) as {
      action?: unknown;
    };

    const action =
      typeof body.action === "string" ? body.action : "";

    if (!isAllowedAction(action)) {
      return NextResponse.json(
        {
          success: false,
          message: "Ação de disponibilidade comercial inválida.",
        },
        { status: 400 },
      );
    }

    if (action === "reconcileAvailability") {
      const result = await reconcileCommercialAvailability();

      return NextResponse.json({
        success: true,
        message: "Disponibilidade comercial atualizada.",
        ...result,
      });
    }

    const result = await syncCommercialDataset({
      dataset: action,
    });

    return NextResponse.json({
      success: true,
      message:
        action === "canceledProducts"
          ? "Produtos cancelados sincronizados."
          : "Produtos restringidos sincronizados.",
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Erro inesperado na disponibilidade comercial.",
      },
      { status: 500 },
    );
  }
}
