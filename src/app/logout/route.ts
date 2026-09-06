import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSiteLocale, localizePath } from "@/lib/i18n/config";

export async function POST(request: NextRequest) {
  const locale = getSiteLocale(request.headers.get("x-site-locale"));
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims) {
    await supabase.auth.signOut();
  }

  revalidatePath("/", "layout");
  return NextResponse.redirect(new URL(localizePath("/login", locale), request.url), { status: 303 });
}
