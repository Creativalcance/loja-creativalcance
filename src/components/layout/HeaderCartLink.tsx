"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { localizePath, type SiteLocale } from "@/lib/i18n/config";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { CART_CHANGE_STORAGE_KEY, getCartCount, getServerCartCount, refreshCartCount, syncCartCountOwner, subscribeCartCount } from "@/lib/cart/count-store";

const copy = {
  pt: { empty: "Carrinho vazio", one: "artigo", many: "artigos" },
  en: { empty: "Cart empty", one: "item", many: "items" },
  fr: { empty: "Panier vide", one: "article", many: "articles" },
  es: { empty: "Carrito vacío", one: "artículo", many: "artículos" },
  de: { empty: "Warenkorb leer", one: "Artikel", many: "Artikel" },
  it: { empty: "Carrello vuoto", one: "articolo", many: "articoli" },
};

export default function HeaderCartLink({ locale, label }: { locale: SiteLocale; label: string }) {
  const count = useSyncExternalStore(subscribeCartCount, getCartCount, getServerCartCount);
  const pathname = usePathname();

  useEffect(() => {
    // Cart/checkout can change after a redirect; other navigation reuses a short memory cache.
    void refreshCartCount(/\/(carrinho|checkout)(\/|$)/.test(pathname));
  }, [pathname]);

  useEffect(() => {
    const onFocus = () => { void refreshCartCount(); };
    const onVisible = () => { if (document.visibilityState === "visible") void refreshCartCount(); };
    const onStorage = (event: StorageEvent) => { if (event.key === CART_CHANGE_STORAGE_KEY) void refreshCartCount(true); };
    const onPageShow = (event: PageTransitionEvent) => { if (event.persisted) void refreshCartCount(true); };
    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisible);
    const { data: { subscription } } = createSupabaseBrowserClient().auth.onAuthStateChange((_event, session) => {
      syncCartCountOwner(session?.user.id ?? null);
    });
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisible);
      subscription.unsubscribe();
    };
  }, []);

  const text = copy[locale];
  const accessibleLabel = count === null ? label : count === 0 ? text.empty : `${label}: ${count} ${count === 1 ? text.one : text.many}`;
  return <Link href={localizePath("/carrinho", locale)} title={accessibleLabel} aria-label={accessibleLabel}
    className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#162334]/12 bg-white text-[#162334]/75 transition hover:border-[#162334]/35 hover:text-[#162334]">
    <ShoppingCart className="h-5 w-5" aria-hidden="true" />
    {count !== null && count > 0 && <span aria-hidden="true" className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#c94d00] px-1 text-[10px] font-bold leading-none !text-white ring-2 ring-white">{count > 99 ? "99+" : count}</span>}
    <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">{count === null ? "" : accessibleLabel}</span>
  </Link>;
}
