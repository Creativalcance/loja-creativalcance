import Link from "next/link";
import { Search, ShoppingCart, Store, UserRound } from "lucide-react";
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
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-6 px-6">
        <Link href="/" className="group">
          <span className="block text-lg font-semibold tracking-tight text-neutral-950">
            360 Merchandising
          </span>
          <span className="block text-xs font-medium uppercase tracking-[0.24em] text-neutral-400">
            B2B Premium
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium text-neutral-600 lg:flex">
          <Link href="/categorias" className="transition hover:text-neutral-950">
            Categorias
          </Link>

          <Link href="/blog" className="transition hover:text-neutral-950">
            Guias B2B
          </Link>

          <Link href="/ajuda" className="transition hover:text-neutral-950">
            Ajuda
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/pesquisa"
            className="hidden items-center rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:border-neutral-950 hover:text-neutral-950 md:inline-flex"
          >
            <Search className="mr-2 h-4 w-4" />
            Pesquisar
          </Link>

          <Link
            href="/carrinho"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 transition hover:border-neutral-950 hover:text-neutral-950"
            aria-label="Carrinho"
          >
            <ShoppingCart className="h-5 w-5" />
          </Link>

          {user ? (
            <a
              href={context === "customer" ? "/" : isAdmin ? "/admin" : "/area-cliente"}
              className="inline-flex items-center rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold !text-white transition hover:bg-neutral-800"
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
              className="inline-flex items-center rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold !text-white transition hover:bg-neutral-800"
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
