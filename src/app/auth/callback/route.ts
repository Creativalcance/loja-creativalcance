import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSiteLocale, localizePath } from "@/lib/i18n/config";
import { notifyAccountWelcome } from "@/lib/notifications/customer-email";

function safeNext(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/area-cliente";
}

export async function GET(request: NextRequest) {
  const locale = getSiteLocale(request.headers.get("x-site-locale"));
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  const supabase = await createSupabaseServerClient();

  async function redirectAfterConfirmation() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      try {
        await notifyAccountWelcome({
          userId: user.id,
          email: user.email,
          name: typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "",
          locale: getSiteLocale(
            typeof user.user_metadata?.locale === "string"
              ? user.user_metadata.locale
              : request.headers.get("x-site-locale"),
          ),
        });
      } catch (error) {
        console.error("Account welcome email failed", {
          userId: user.id,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
    return NextResponse.redirect(new URL(next, request.url));
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return redirectAfterConfirmation();
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (!error) return redirectAfterConfirmation();
  }

  return NextResponse.redirect(new URL(`${localizePath("/login", locale)}?erro=ligacao-invalida-ou-expirada`, request.url));
}
