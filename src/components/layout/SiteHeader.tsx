import Image from "next/image";
import Link from "next/link";
import { Search, ShoppingCart, Sparkles, Store, UserRound } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Profile = {
  full_name: string | null;
  email: string;
  role: string;
};

type SiteHeaderProps = {
  context?: "store" | "customer";
};

export default async function SiteHeader({ context = "store" }: SiteHeaderProps) {
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
      <div className="mx-auto flex h-[4.75rem] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="group shrink-0" aria-label="360 Merchandising — página inicial">
          <Image
            src="/brand/360-merchandising.png"
            alt="360 Merchandising"
            width={2000}
            height={452}
            priority
            className="brand-logo h-auto w-44 transition group-hover:opacity-80 sm:w-52"
          />
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium text-[#162334]/70 lg:flex" aria-label="Navegação principal">
          <Link href="/smart-merch" className="inline-flex items-center gap-1.5 text-[#e85f00] transition hover:text-[#ff6a00]">
            <Sparkles className="h-4 w-4" />
            Smart Merch
          </Link>
          <Link href="/categorias" className="transition hover:text-[#162334]">
            Categorias
          </Link>

          <Link href="/blog" className="transition hover:text-[#162334]">
            Guias B2B
          </Link>

          <Link href="/ajuda" className="transition hover:text-[#162334]">
            Ajuda
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/pesquisa"
            className="hidden items-center rounded-full border border-[#162334]/12 bg-white px-4 py-2 text-sm font-semibold text-[#162334]/75 transition hover:border-[#162334]/35 hover:text-[#162334] md:inline-flex"
          >
            <Search className="mr-2 h-4 w-4" />
            Pesquisar
          </Link>

          <Link
            href="/carrinho"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#162334]/12 bg-white text-[#162334]/75 transition hover:border-[#162334]/35 hover:text-[#162334]"
            aria-label="Carrinho"
          >
            <ShoppingCart className="h-5 w-5" />
          </Link>

          {user ? (
            <a
              href={context === "customer" ? "/" : isAdmin ? "/admin" : "/area-cliente"}
              className="inline-flex items-center rounded-full bg-[#162334] px-4 py-2 text-sm font-semibold !text-white transition hover:bg-[#24364d]"
            >
              {context === "customer" ? (
                <Store className="mr-2 h-4 w-4 !text-white" />
              ) : (
                <UserRound className="mr-2 h-4 w-4 !text-white" />
              )}
              <span className="!text-white">
                {context === "customer" ? "Ver loja" : isAdmin ? "Admin" : "Área Cliente"}
              </span>
            </a>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center rounded-full bg-[#162334] px-4 py-2 text-sm font-semibold !text-white transition hover:bg-[#24364d]"
            >
              <UserRound className="mr-2 h-4 w-4 !text-white" />
              <span className="!text-white">Entrar</span>
            </Link>
          )}

        </div>
      </div>
    </header>
  );
}
