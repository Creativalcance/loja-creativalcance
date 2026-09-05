"use client";

import { usePathname } from "next/navigation";
import { Languages } from "lucide-react";
import {
  localizePath,
  SITE_LOCALES,
  type SiteLocale,
} from "@/lib/i18n/config";

type LanguageSwitcherProps = {
  locale: SiteLocale;
  label: string;
};

export default function LanguageSwitcher({
  locale,
  label,
}: LanguageSwitcherProps) {
  const pathname = usePathname();

  return (
    <label className="relative inline-flex h-11 items-center rounded-full border border-[#162334]/12 bg-white pl-1 text-[#162334]/70 transition hover:border-[#162334]/35 sm:pl-3">
      <Languages className="hidden h-4 w-4 sm:block" aria-hidden="true" />
      <span className="sr-only">{label}</span>
      <select
        value={locale}
        onChange={(event) => {
          const nextLocale = event.target.value as SiteLocale;
          const nextPath = localizePath(pathname, nextLocale);

          document.cookie = `site-locale=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
          window.location.assign(
            `${nextPath}${window.location.search}${window.location.hash}`,
          );
        }}
        aria-label={label}
        className="h-full w-10 cursor-pointer appearance-none bg-transparent py-0 pl-2 pr-4 text-sm font-semibold uppercase outline-none sm:w-14 sm:pr-5"
      >
        {Object.entries(SITE_LOCALES).map(([value, config]) => (
          <option key={value} value={value}>
            {value.toUpperCase()} · {config.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2 text-[10px]">⌄</span>
    </label>
  );
}
