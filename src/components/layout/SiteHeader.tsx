import Image from "next/image";
import Link from "next/link";
import { Search, ShoppingCart, Sparkles, Store, UserRound } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";
import { localizePath } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import { getCurrentLocale } from "@/lib/i18n/server";

type Profile = {
  full_name: string | null;
  email: string;
  role: string;
};

type SiteHeaderProps = {
  context?: "store" | "customer";
};

export default async function SiteHeader({ context = "store" }: SiteHeaderProps) {
  const locale = await getCurrentLocale();
  const messages = getMessages(locale).header;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: Profile | null = null;

  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, email, role")
      .eq("id", user.id)
      .maybeSingle<Profile>();

    profile = data ?? null;
  }

  const isAdmin = profile?.role === "admin";

  return (
    <header className="sticky top-0 z-50 border-b border-[#162334]/10 bg-white/90 shadow-[0_1px_0_rgba(22,35,52,0.04)] backdrop-blur-xl">
      <div className="mx-auto flex h-[4.75rem] max-w-7xl items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6">
        <Link href={localizePath("/", locale)} className="group shrink-0" aria-label={`360 Merchandising — ${messages.home}`}>
          <Image
            src="/brand/360-merchandising.png"
            alt="360 Merchandising"
            width={2000}
            height={452}
            priority
            className="brand-logo h-auto w-32 transition group-hover:opacity-80 sm:w-44 lg:w-52"
          />
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium text-[#162334]/70 lg:flex" aria-label={locale === "en" ? "Main navigation" : locale === "fr" ? "Navigation principale" : "Navegação principal"}>
          <Link href={localizePath("/smart-merch", locale)} className="inline-flex items-center gap-1.5 text-[#e85f00] transition hover:text-[#ff6a00]">
            <Sparkles className="h-4 w-4" />
            Smart Merch
          </Link>
          <Link href={localizePath("/categorias", locale)} className="transition hover:text-[#162334]">
            {messages.categories}
          </Link>

          <Link href={localizePath("/blog", locale)} className="transition hover:text-[#162334]">
            {messages.guides}
          </Link>

          <Link href={localizePath("/ajuda", locale)} className="transition hover:text-[#162334]">
            {messages.help}
          </Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href={localizePath("/pesquisa", locale)}
            className="hidden items-center rounded-full border border-[#162334]/12 bg-white px-4 py-2 text-sm font-semibold text-[#162334]/75 transition hover:border-[#162334]/35 hover:text-[#162334] md:inline-flex"
          >
            <Search className="mr-2 h-4 w-4" />
            {messages.search}
          </Link>

          <LanguageSwitcher locale={locale} label="Language / Langue / Idioma" />

          <Link
            href={localizePath("/carrinho", locale)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#162334]/12 bg-white text-[#162334]/75 transition hover:border-[#162334]/35 hover:text-[#162334]"
            aria-label={messages.cart}
          >
            <ShoppingCart className="h-5 w-5" />
          </Link>

          {user ? (
            <a
              href={context === "customer" ? localizePath("/", locale) : isAdmin ? "/admin" : localizePath("/area-cliente", locale)}
              className="inline-flex items-center rounded-full bg-[#162334] px-4 py-2 text-sm font-semibold !text-white transition hover:bg-[#24364d]"
            >
              {context === "customer" ? (
                <Store className="mr-2 h-4 w-4 !text-white" />
              ) : (
                <UserRound className="mr-2 h-4 w-4 !text-white" />
              )}
              <span className="!text-white">
                {context === "customer" ? messages.store : isAdmin ? messages.admin : messages.account}
              </span>
            </a>
          ) : (
            <Link
              href={localizePath("/login", locale)}
              className="inline-flex items-center rounded-full bg-[#162334] px-4 py-2 text-sm font-semibold !text-white transition hover:bg-[#24364d]"
            >
              <UserRound className="mr-2 h-4 w-4 !text-white" />
              <span className="!text-white">{messages.signIn}</span>
            </Link>
          )}

        </div>
      </div>
    </header>
  );
}
