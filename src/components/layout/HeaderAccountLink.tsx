"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Store, UserRound } from "lucide-react";
import { localizePath, type SiteLocale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type HeaderAccountLinkProps = {
  context: "store" | "customer";
  locale: SiteLocale;
};

type AccountState = "guest" | "customer" | "admin";

export default function HeaderAccountLink({ context, locale }: HeaderAccountLinkProps) {
  const messages = getMessages(locale).header;
  const [account, setAccount] = useState<AccountState>("guest");

  useEffect(() => {
    if (context === "customer") {
      return;
    }

    const supabase = createSupabaseBrowserClient();
    let active = true;

    async function resolveRole(userId: string) {
      if (!active) {
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle<{ role: string }>();

      if (active) {
        setAccount(profile?.role === "admin" ? "admin" : "customer");
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
        : localizePath("/login", locale);
  const label = isCustomerContext
    ? messages.store
    : account === "admin"
      ? messages.admin
      : account === "customer"
        ? messages.account
        : messages.signIn;
  const Icon = isCustomerContext ? Store : UserRound;

  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-full bg-[#162334] px-4 py-2 text-sm font-semibold !text-white transition hover:bg-[#24364d]"
    >
      <Icon className="mr-2 h-4 w-4 !text-white" aria-hidden="true" />
      <span className="!text-white">{label}</span>
    </Link>
  );
}
