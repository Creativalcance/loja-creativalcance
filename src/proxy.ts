import { hasCommercialAccess } from "@/lib/auth/commercial-access";
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse, userAgent } from "next/server";
import { DEFAULT_SITE_LOCALE, isSiteLocale, localizePath, type SiteLocale } from "@/lib/i18n/config";
import { detectEntryLocale, isDocumentNavigation } from "@/lib/i18n/detection";
import { authUnavailableMessage, isAuthUnavailable } from "@/lib/auth/availability";

export async function proxy(request: NextRequest) {
  const originalPath = request.nextUrl.pathname;
  // Public XML has no locale/session state; avoid cookies that disable CDN caching.
  if (originalPath === "/sitemap.xml" || /^\/sitemaps\/(pt|en|fr|es|de|it)\/sitemap\.xml$/.test(originalPath)) {
    return NextResponse.next();
  }
  const firstSegment = originalPath.split("/").filter(Boolean)[0] ?? "";
  const localizedPath = isSiteLocale(firstSegment) && firstSegment !== "pt";
  const locale = localizedPath ? firstSegment : DEFAULT_SITE_LOCALE;
  const savedLocale = request.cookies.get("site-locale")?.value;
  const hasLocalePreference = Boolean(savedLocale && isSiteLocale(savedLocale));
  const humanNavigation = isDocumentNavigation(request) && !userAgent(request).isBot;

  function rememberLocale(response: NextResponse, selectedLocale: SiteLocale) {
    if (!hasLocalePreference && humanNavigation && (originalPath === "/" || localizedPath)) {
      response.cookies.set("site-locale", selectedLocale, {
        path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365,
        secure: request.nextUrl.protocol === "https:",
      });
    }
  }

  // Personalize only the homepage entry. Explicit URLs, shopping flows,
  // server actions, prefetches and crawlers keep their existing routes.
  if (originalPath === "/" && humanNavigation) {
    const entryLocale = detectEntryLocale({
      savedLocale,
      country: request.headers.get("x-vercel-ip-country"),
      acceptLanguage: request.headers.get("accept-language"),
    });
    if (entryLocale !== DEFAULT_SITE_LOCALE) {
      const destination = request.nextUrl.clone();
      destination.pathname = localizePath("/", entryLocale);
      const redirect = NextResponse.redirect(destination, 307);
      redirect.headers.set("Cache-Control", "private, no-store");
      redirect.headers.set("Vercel-CDN-Cache-Control", "no-store");
      rememberLocale(redirect, entryLocale);
      return redirect;
    }
  }
  const applicationPath = localizedPath
    ? originalPath.replace(new RegExp(`^/${firstSegment}(?=/|$)`), "") || "/"
    : originalPath;
  const isAdminPath = applicationPath.startsWith("/admin") || applicationPath.startsWith("/api/admin");
  const isCustomerPath = applicationPath.startsWith("/area-cliente");
  const isSalesPath = applicationPath === "/area-comercial" || applicationPath.startsWith("/area-comercial/");
  const isCheckoutPath = applicationPath === "/checkout" || applicationPath.startsWith("/checkout/");
  const isAuthPath =
    applicationPath.startsWith("/auth/") ||
    applicationPath === "/login" ||
    applicationPath === "/logout" ||
    applicationPath === "/registo" ||
    applicationPath === "/recuperar-password" ||
    applicationPath === "/nova-password";
  const needsSessionHandling = isAdminPath || isCustomerPath || isSalesPath || isCheckoutPath || isAuthPath;
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

    rememberLocale(nextResponse, locale);
    if (originalPath === "/") {
      // Do not share a homepage response across visitors with different locales.
      nextResponse.headers.set("Cache-Control", "private, no-store");
      nextResponse.headers.set("Vercel-CDN-Cache-Control", "no-store");
    }

    return nextResponse;
  }

  let response = createResponse();

  if (!needsSessionHandling) {
    return response;
  }

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

  function withSession(nextResponse: NextResponse) {
    for (const cookie of response.cookies.getAll()) nextResponse.cookies.set(cookie);
    for (const header of ["cache-control", "expires", "pragma"]) {
      const value = response.headers.get(header);
      if (value) nextResponse.headers.set(header, value);
    }
    return nextResponse;
  }

  function unavailableResponse() {
    const message = authUnavailableMessage[locale];
    const headers = { "Cache-Control": "private, no-store", "Retry-After": "30" };
    if (applicationPath.startsWith("/api/") || request.method !== "GET") {
      return withSession(NextResponse.json({ error: message }, { status: 503, headers }));
    }
    const retry = { pt: "Tentar novamente", en: "Try again", fr: "Réessayer", es: "Intentar de nuevo", de: "Erneut versuchen", it: "Riprova" }[locale];
    return withSession(new NextResponse(
      `<!doctype html><html lang="${locale}"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>360 Merchandising</title></head><body style="font-family:system-ui;margin:0;background:#f5f7f9;color:#162334"><main style="max-width:560px;margin:12vh auto;padding:32px"><h1>360 Merchandising</h1><p role="alert">${message}</p><p><a href="" style="color:inherit">${retry}</a></p></main></body></html>`,
      { status: 503, headers: { ...headers, "Content-Type": "text/html; charset=utf-8" } },
    ));
  }

  // A password login authenticates afresh in the Server Action. Refreshing an
  // old cookie first can block valid credentials while the old session fails.
  if (applicationPath === "/login" && request.method === "POST") return response;

  let claimsData;
  try {
    const result = await supabase.auth.getClaims();
    if (isAuthUnavailable(result.error)) return unavailableResponse();
    claimsData = result.data;
  } catch {
    return unavailableResponse();
  }
  const path = applicationPath;

  if (isCustomerPath || isSalesPath || isCheckoutPath) {
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
  }

  if (isAdminPath || isCustomerPath || isSalesPath) {
    const userId = typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null;

    if (!userId) {
      if (path.startsWith("/api/")) {
        return withSession(NextResponse.json({ error: "Autenticação necessária." }, { status: 401 }));
      }

      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = localizedPath ? `/${locale}/login` : "/login";
      loginUrl.search = `?next=${encodeURIComponent(originalPath + request.nextUrl.search)}`;
      return withSession(NextResponse.redirect(loginUrl));
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", userId)
      .maybeSingle<{ role: string; is_active: boolean }>();
    if (profileError) return unavailableResponse();

    let allowed = Boolean(profile?.is_active) &&
      ((isAdminPath && profile?.role === "admin") ||
        (isCustomerPath && profile?.role === "customer") || (isSalesPath && ["customer", "admin"].includes(profile?.role || "")));

    if (allowed && isSalesPath) {
      const { data: agent, error: agentError } = await supabase.from("sales_agents").select("status").eq("user_id", userId).maybeSingle();
      if (agentError) return unavailableResponse();
      allowed = hasCommercialAccess(profile, agent);
    }

    if (!allowed) {
      if (path.startsWith("/api/")) {
        return withSession(NextResponse.json({ error: "Sem permissão." }, { status: 403 }));
      }

      const destination = request.nextUrl.clone();
      destination.pathname = profile?.role === "admin"
        ? "/admin"
        : localizedPath
          ? `/${locale}`
          : "/";
      destination.search = "";
      return withSession(NextResponse.redirect(destination));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
