"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Store, UserRound, BriefcaseBusiness } from "lucide-react";
import { salesCopy } from "@/lib/sales/i18n";
import { hasCommercialAccess } from "@/lib/auth/commercial-access";
import { localizePath, type SiteLocale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { usePathname, useRouter } from "next/navigation";
import { preserveShoppingBeforeLogin } from "@/lib/cart/login-snapshot";

type HeaderAccountLinkProps = {
  context: "store" | "customer";
  locale: SiteLocale;
};

type AccountState = "guest" | "customer" | "admin";

export default function HeaderAccountLink({
  context,
  locale,
}: HeaderAccountLinkProps) {
  const messages = getMessages(locale).header;
  const pathname = usePathname();
  const router = useRouter();
  const [loginError, setLoginError] = useState(false);
  const [account, setAccount] = useState<AccountState>("guest");

  const [commercial, setCommercial] = useState(false);
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let active = true;

    async function resolveRole(userId: string) {
      if (!active) {
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role,is_active")
        .eq("id", userId)
        .maybeSingle<{ role: string; is_active: boolean }>();

      const { data: membership } = await supabase
        .from("sales_agents")
        .select("status")
        .eq("user_id", userId)
        .maybeSingle();
      if (active) {
        setCommercial(hasCommercialAccess(profile, membership));
        setAccount(
          !profile?.is_active
            ? "guest"
            : profile.role === "admin"
              ? "admin"
              : "customer",
        );
      }
    }

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        void resolveRole(session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) {
        return;
      }

      if (!session?.user) {
        setAccount("guest");
        setCommercial(false);
        return;
      }

      window.setTimeout(() => {
        void resolveRole(session.user.id);
      }, 0);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [context]);

  const isCustomerContext = context === "customer";
  const href = isCustomerContext
    ? localizePath("/", locale)
    : account === "admin"
      ? "/admin"
      : account === "customer"
        ? localizePath("/area-cliente", locale)
        : `${localizePath("/login", locale)}?next=${encodeURIComponent(pathname)}`;
  const label = isCustomerContext
    ? messages.store
    : account === "admin"
      ? messages.admin
      : account === "customer"
        ? messages.account
        : messages.signIn;
  const Icon = isCustomerContext ? Store : UserRound;

  return (
    <>
      {commercial && (
        <Link
          href={localizePath("/area-comercial", locale)}
          title={salesCopy(locale).title}
          aria-label={salesCopy(locale).title}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 text-sm font-semibold text-[#162334]"
        >
          <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />
          <span className="hidden xl:inline">{salesCopy(locale).title}</span>
        </Link>
      )}
      <Link
        href={href}
        onClick={async (event) => {
          if (account !== "guest" || isCustomerContext) return;
          event.preventDefault();
          try {
            await preserveShoppingBeforeLogin();
            router.push(
              `${localizePath("/login", locale)}?next=${encodeURIComponent(window.location.pathname + window.location.search + window.location.hash)}`,
            );
          } catch {
            setLoginError(true);
          }
        }}
        className="inline-flex items-center rounded-full bg-[#162334] px-4 py-2 text-sm font-semibold !text-white transition hover:bg-[#24364d]"
      >
        <Icon className="mr-2 h-4 w-4 !text-white" aria-hidden="true" />
        <span className="!text-white">
          {loginError
            ? {
                pt: "Não foi possível guardar. Tenta novamente.",
                en: "Could not save. Try again.",
                fr: "Enregistrement impossible. Réessayez.",
                es: "No se ha podido guardar. Int\u00E9ntalo de nuevo.",
                de: "Speichern fehlgeschlagen. Bitte versuchen Sie es erneut.",
                it: "Impossibile salvare. Riprova.",
              }[locale]
            : label}
        </span>
      </Link>
    </>
  );
}
