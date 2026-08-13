import { NextResponse } from "next/server";
import { interpretSmartQuery } from "@/lib/smart-merch/interpret-smart-query";
import { searchSmartMerchProducts } from "@/lib/smart-merch/search-products";
import { smartMerchRequestSchema } from "@/lib/smart-merch/smart-query";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 10_000) {
      return NextResponse.json({ error: "Pedido demasiado grande." }, { status: 413 });
    }

    const body = smartMerchRequestSchema.parse(await request.json());
    const query = await interpretSmartQuery(body);
    const response = await searchSmartMerchProducts(query);

    return NextResponse.json(response, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "SMART_MERCH_FAILED";
    const isConfigurationError = message === "OPENAI_API_KEY_MISSING";

    console.error("Smart Merch search failed:", message);

    return NextResponse.json(
      {
        error: isConfigurationError
          ? "O 360 Smart Merch ainda não está configurado."
          : "Não foi possível criar a seleção. Tente novamente.",
      },
      { status: isConfigurationError ? 503 : 400 },
    );
  }
}
