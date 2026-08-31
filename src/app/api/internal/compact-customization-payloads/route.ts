import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const CLEANUP_TOKEN = "ao9IvBRMnwY9z_TEF2iuH0wVzomUHPTZyPKSAzFZi8w";
const SELECT_BATCH_SIZE = 1_000;
const UPDATE_CHUNK_SIZE = 150;
const MAX_ROWS_PER_RUN = 40_000;
const MAX_RUNTIME_MS = 240_000;

function chunkArray<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (token !== CLEANUP_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const supabaseAdmin = createSupabaseAdminClient();
  let cleaned = 0;
  let done = false;

  while (
    cleaned < MAX_ROWS_PER_RUN &&
    Date.now() - startedAt < MAX_RUNTIME_MS
  ) {
    const { data, error } = await supabaseAdmin
      .from("product_customization_options")
      .select("id")
      .not("printing_price_table_id", "is", null)
      .not("raw_payload", "eq", "{}")
      .limit(SELECT_BATCH_SIZE)
      .returns<Array<{ id: string }>>();

    if (error) {
      return NextResponse.json(
        { error: error.message, cleaned, done: false },
        { status: 500 },
      );
    }

    const ids = (data ?? []).map((row) => row.id);

    if (ids.length === 0) {
      done = true;
      break;
    }

    for (const idChunk of chunkArray(ids, UPDATE_CHUNK_SIZE)) {
      const { error: updateError } = await supabaseAdmin
        .from("product_customization_options")
        .update({ raw_payload: {} })
        .in("id", idChunk)
        .not("printing_price_table_id", "is", null);

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message, cleaned, done: false },
          { status: 500 },
        );
      }
    }

    cleaned += ids.length;
  }

  return NextResponse.json({
    cleaned,
    done,
    elapsedMs: Date.now() - startedAt,
  });
}
