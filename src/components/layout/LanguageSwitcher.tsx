"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Check, ChevronDown, LoaderCircle } from "lucide-react";
import { localizePath, SITE_LOCALES, type SiteLocale } from "@/lib/i18n/config";
import { preserveShoppingBeforeNavigation } from "@/lib/cart/login-snapshot";

const locales = Object.keys(SITE_LOCALES) as SiteLocale[];
const flags: Record<SiteLocale, string> = { pt: "pt", en: "gb", fr: "fr", es: "es", de: "de", it: "it" };
const saveError: Record<SiteLocale, string> = {
  pt: "Não foi possível guardar a seleção. Tenta novamente.",
  en: "Your selection could not be saved. Please try again.",
  fr: "Impossible d’enregistrer votre sélection. Réessayez.",
  es: "No se ha podido guardar la selección. Inténtalo de nuevo.",
  de: "Die Auswahl konnte nicht gespeichert werden. Bitte erneut versuchen.",
  it: "Impossibile salvare la selezione. Riprova.",
};

function Flag({ locale }: { locale: SiteLocale }) {
  return <Image src={`/flags/${flags[locale]}.svg`} width={24} height={18} alt="" unoptimized
    className="h-[18px] w-6 shrink-0 rounded-[3px] object-cover shadow-[0_0_0_1px_rgba(22,35,52,0.1)]" />;
}

function navigateToLocale(locale: SiteLocale, pathname: string) {
  document.cookie = `site-locale=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
  window.location.assign(`${localizePath(pathname, locale)}${window.location.search}${window.location.hash}`);
}

export default function LanguageSwitcher({ locale, label }: { locale: SiteLocale; label: string }) {
  const pathname = usePathname();
  const menuId = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const options = useRef<(HTMLButtonElement | null)[]>([]);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open) return;
    options.current[locales.indexOf(locale)]?.focus();
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open, locale]);

  function close() { setOpen(false); trigger.current?.focus(); }

  function handleKeys(event: KeyboardEvent) {
    if (event.key === "Escape") { event.preventDefault(); close(); return; }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    if (!open) { setOpen(true); return; }
    const current = options.current.findIndex((option) => option === document.activeElement);
    const next = event.key === "Home" ? 0 : event.key === "End" ? locales.length - 1
      : (current + (event.key === "ArrowDown" ? 1 : -1) + locales.length) % locales.length;
    options.current[next]?.focus();
  }

  async function select(nextLocale: SiteLocale) {
    if (pending) return;
    if (nextLocale === locale) { close(); return; }
    setPending(true);
    setError(false);
    try {
      await preserveShoppingBeforeNavigation();
      navigateToLocale(nextLocale, pathname);
    } catch {
      setPending(false);
      setError(true);
      setOpen(true);
    }
  }

  return (
    <div ref={root} className="relative shrink-0" onKeyDown={handleKeys}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
      <button ref={trigger} type="button" onClick={() => setOpen(!open)} disabled={pending}
        aria-label={`${label}: ${SITE_LOCALES[locale].label}`} aria-haspopup="menu" aria-expanded={open} aria-controls={menuId} aria-busy={pending}
        className="inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border border-[#162334]/10 bg-white px-2 text-sm font-semibold text-[#162334] shadow-sm transition hover:border-[#162334]/25 hover:bg-[#f6f7f8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f97316] disabled:cursor-wait sm:gap-2 sm:px-3">
        <Flag locale={locale} />
        <span className="hidden uppercase min-[380px]:inline xl:hidden">{locale}</span>
        <span className="hidden xl:inline" lang={SITE_LOCALES[locale].htmlLang}>{SITE_LOCALES[locale].label}</span>
        {pending ? <LoaderCircle aria-hidden="true" className="hidden h-3.5 w-3.5 animate-spin sm:block" />
          : <ChevronDown aria-hidden="true" className={`hidden h-3.5 w-3.5 text-[#162334]/45 transition-transform sm:block ${open ? "rotate-180" : ""}`} />}
      </button>
      {open && (
        <div id={menuId} role="menu" aria-label={label} aria-busy={pending}
          className="absolute right-0 top-full mt-3 w-52 max-w-[calc(100vw-2rem)] rounded-2xl border border-[#162334]/10 bg-white p-1.5 shadow-[0_16px_48px_rgba(22,35,52,0.16)]">
          {locales.map((value, index) => (
            <button key={value} ref={(element) => { options.current[index] = element; }} type="button"
              role="menuitemradio" aria-checked={value === locale} disabled={pending} tabIndex={-1}
              onClick={() => void select(value)}
              className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition focus-visible:outline-2 focus-visible:outline-[#f97316] disabled:cursor-wait ${value === locale ? "bg-[#fff3e9] font-semibold text-[#b84b00]" : "text-[#162334]/80 hover:bg-[#f6f7f8]"}`}>
              <Flag locale={value} />
              <span className="flex-1" lang={SITE_LOCALES[value].htmlLang}>{SITE_LOCALES[value].label}</span>
              {value === locale && <Check className="h-4 w-4" aria-hidden="true" />}
            </button>
          ))}
          {error && <p role="alert" className="px-3 py-2 text-xs leading-5 text-red-700">{saveError[locale]}</p>}
        </div>
      )}
    </div>
  );
}
