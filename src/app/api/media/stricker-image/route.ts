import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ALLOWED_HOSTNAME = "cdn.hideacontent.com";

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("url");

  if (!source) {
    return NextResponse.json(
      { message: "O endereço da imagem é obrigatório." },
      { status: 400 },
    );
  }

  let sourceUrl: URL;

  try {
    sourceUrl = new URL(source);
  } catch {
    return NextResponse.json(
      { message: "O endereço da imagem é inválido." },
      { status: 400 },
    );
  }

  if (
    sourceUrl.protocol !== "https:" ||
    sourceUrl.hostname !== ALLOWED_HOSTNAME
  ) {
    return NextResponse.json(
      { message: "A origem da imagem não é permitida." },
      { status: 403 },
    );
  }

  try {
    const response = await fetch(sourceUrl, {
      headers: {
        Accept: "image/avif,image/webp,image/png,image/jpeg,image/*",
      },
      next: { revalidate: 86_400 },
    });

    const contentType = response.headers.get("content-type") ?? "";

    if (!response.ok || !contentType.startsWith("image/")) {
      return NextResponse.json(
        { message: "A imagem não existe no fornecedor." },
        { status: 404 },
      );
    }

    return new NextResponse(response.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control":
          "public, max-age=86400, stale-while-revalidate=604800",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json(
      { message: "Não foi possível carregar a imagem do fornecedor." },
      { status: 502 },
    );
  }
}
