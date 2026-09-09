"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import GoogleAnalyticsTag from "@/components/analytics/GoogleAnalyticsTag";
import { localizePath, type SiteLocale } from "@/lib/i18n/config";

const COOKIE_NAME = "cookie-consent-v1";
const MAX_AGE = 60 * 60 * 24 * 180;

type ConsentChoice = "all" | "essential" | "declined";
type ConsentPreferences = { version: 1; choice: ConsentChoice; analytics: boolean; marketing: boolean; updatedAt: string };

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function readConsent(): ConsentPreferences | null {
  const match = document.cookie.split("; ").find((entry) => entry.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(match.slice(COOKIE_NAME.length + 1))) as ConsentPreferences;
    return parsed.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

function updateGoogleConsent(granted: boolean) {
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag(...args: unknown[]) { window.dataLayer?.push(args); };
  window.gtag("consent", "update", {
    analytics_storage: granted ? "granted" : "denied",
    ad_storage: granted ? "granted" : "denied",
    ad_user_data: granted ? "granted" : "denied",
    ad_personalization: granted ? "granted" : "denied",
  });

  if (!granted) {
    document.cookie.split("; ").forEach((entry) => {
      const name = entry.split("=")[0];
      if (name === "_ga" || name === "_gid" || name === "_gat" || name.startsWith("_ga_")) {
        document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax; Secure`;
      }
    });
  }
}

export default function CookieConsentManager({ locale }: { locale: SiteLocale }) {
  const [preferences, setPreferences] = useState<ConsentPreferences | null>(null);
  const [ready, setReady] = useState(false);
  const copy = locale === "en"
    ? { title: "Your privacy choices", text: "We use essential cookies for the store, cart, authentication and secure payments. With your permission, we also use analytics and marketing cookies.", policy: "Cookie Policy", all: "Accept all", decline: "Decline", essential: "Essential only" }
    : locale === "fr"
      ? { title: "Vos choix de confidentialité", text: "Nous utilisons des cookies essentiels pour la boutique, le panier, l’authentification et les paiements sécurisés. Avec votre accord, nous utilisons également des cookies d’analyse et de marketing.", policy: "Politique de Cookies", all: "Tout accepter", decline: "Refuser", essential: "Essentiels uniquement" }
      : { title: "As suas escolhas de privacidade", text: "Utilizamos cookies essenciais para a loja, carrinho, autenticação e pagamentos seguros. Com a sua autorização, utilizamos também cookies de análise e marketing.", policy: "Política de Cookies", all: "Aceitar todos", decline: "Declinar", essential: "Apenas essenciais" };

  const openPreferences = useCallback(() => {
    setPreferences(null);
    setReady(true);
  }, []);

  useEffect(() => {
    const initialize = window.setTimeout(() => {
      setPreferences(readConsent());
      setReady(true);
    }, 0);
    window.addEventListener("open-cookie-preferences", openPreferences);
    return () => {
      window.clearTimeout(initialize);
      window.removeEventListener("open-cookie-preferences", openPreferences);
    };
  }, [openPreferences]);

  function save(choice: ConsentChoice) {
    const next: ConsentPreferences = {
      version: 1,
      choice,
      analytics: choice === "all",
      marketing: choice === "all",
      updatedAt: new Date().toISOString(),
    };
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(next))}; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax; Secure`;
    updateGoogleConsent(next.analytics);
    setPreferences(next);
    window.dispatchEvent(new CustomEvent("cookie-consent-updated", { detail: next }));
  }

  if (!ready) return null;

  return (
    <>
      {preferences?.analytics ? <GoogleAnalyticsTag /> : null}
      {!preferences ? (
        <div className="fixed inset-x-0 bottom-0 z-[100] p-3 sm:p-5" role="dialog" aria-modal="true" aria-labelledby="cookie-title">
          <div className="mx-auto flex max-w-5xl flex-col gap-5 rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <h2 id="cookie-title" className="text-lg font-semibold text-[#162334]">{copy.title}</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-600">{copy.text} <Link href={localizePath("/politica-de-cookies", locale)} className="font-semibold underline hover:text-neutral-950">{copy.policy}</Link>.</p>
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <button type="button" onClick={() => save("declined")} className="rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">{copy.decline}</button>
              <button type="button" onClick={() => save("essential")} className="rounded-xl border border-[#162334] px-4 py-2.5 text-sm font-semibold text-[#162334] hover:bg-neutral-50">{copy.essential}</button>
              <button type="button" onClick={() => save("all")} className="rounded-xl bg-[#162334] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#22344b]">{copy.all}</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
