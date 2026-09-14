import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSiteLocale, localizePath } from "@/lib/i18n/config";
export async function GET(request: NextRequest) {
  const locale = getSiteLocale(request.nextUrl.searchParams.get("locale"));
  const token = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const supabase = await createSupabaseServerClient();
  if (token && (type === "invite" || type === "recovery")) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type,
    });
    if (!error && data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role,is_active")
        .eq("id", data.user.id)
        .maybeSingle();
      const { data: agent } = await supabase
        .from("sales_agents")
        .select("status,locale,account_kind")
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (
        profile &&
        ["customer", "admin"].includes(profile.role) &&
        profile.is_active &&
        agent &&
        agent.account_kind === "new_account" &&
        ["invited", "active"].includes(agent.status)
      ) {
        const response = NextResponse.redirect(
          new URL(
            localizePath("/nova-password", getSiteLocale(agent.locale)),
            request.url,
          ),
        );
        response.headers.set("Cache-Control", "private, no-store");
        response.headers.set("Referrer-Policy", "no-referrer");
        return response;
      }
      await supabase.auth.signOut();
    }
  }
  const response = NextResponse.redirect(
    new URL(
      localizePath("/login", locale) + "?erro=ligacao-invalida-ou-expirada",
      request.url,
    ),
  );
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
