import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { DEFAULT_SITE_LOCALE, isSiteLocale } from "@/lib/i18n/config";

export async function proxy(request: NextRequest) {
  const originalPath = request.nextUrl.pathname;
  const firstSegment = originalPath.split("/").filter(Boolean)[0] ?? "";
  const localizedPath = isSiteLocale(firstSegment) && firstSegment !== "pt";
  const locale = localizedPath ? firstSegment : DEFAULT_SITE_LOCALE;
  const applicationPath = localizedPath
    ? originalPath.replace(new RegExp(`^/${firstSegment}(?=/|$)`), "") || "/"
    : originalPath;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-site-locale", locale);

  function createResponse() {
    let nextResponse: NextResponse;

    if (localizedPath) {
      const destination = request.nextUrl.clone();
      destination.pathname = applicationPath;
      nextResponse = NextResponse.rewrite(destination, {
        request: { headers: requestHeaders },
      });
    } else {
      nextResponse = NextResponse.next({ request: { headers: requestHeaders } });
    }

    nextResponse.cookies.set("site-locale", locale, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });

    return nextResponse;
  }

  let response = createResponse();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = createResponse();

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });

        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      },
    },
  });

  const { data: claimsData } = await supabase.auth.getClaims();
  const path = applicationPath;
  const isAdminPath = path.startsWith("/admin") || path.startsWith("/api/admin");
  const isCustomerPath = path.startsWith("/area-cliente");

  if (isCustomerPath || path === "/checkout" || path.startsWith("/checkout/")) {
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
  }

  if (isAdminPath || isCustomerPath) {
    const userId = typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null;

    if (!userId) {
      if (path.startsWith("/api/")) {
        return NextResponse.json({ error: "Autenticação necessária." }, { status: 401 });
      }

      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = localizedPath ? `/${locale}/login` : "/login";
      loginUrl.search = `?next=${encodeURIComponent(originalPath + request.nextUrl.search)}`;
      return NextResponse.redirect(loginUrl);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", userId)
      .maybeSingle<{ role: string; is_active: boolean }>();

    const allowed = profile?.is_active !== false &&
      ((isAdminPath && profile?.role === "admin") ||
        (isCustomerPath && profile?.role === "customer"));

    if (!allowed) {
      if (path.startsWith("/api/")) {
        return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
      }

      const destination = request.nextUrl.clone();
      destination.pathname = profile?.role === "admin"
        ? "/admin"
        : localizedPath
          ? `/${locale}`
          : "/";
      destination.search = "";
      return NextResponse.redirect(destination);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
