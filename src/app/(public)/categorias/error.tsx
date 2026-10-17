"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getSiteLocale, localizePath } from "@/lib/i18n/config";
import { catalogNavigationCopy } from "@/components/catalog/navigation-copy";

export default function CatalogError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const pathname = usePathname();
  const locale = getSiteLocale(pathname.split("/")[1]);
  const copy = catalogNavigationCopy[locale];
  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <h1 role="alert" className="text-xl font-semibold text-[#162334]">{copy.error}</h1>
      <div className="mt-6 flex flex-wrap items-center gap-6">
        <button type="button" onClick={() => retry()} className="rounded-full bg-[#162334] px-6 py-3 text-white">{copy.retry}</button>
        <Link href={localizePath("/", locale)} className="underline">{copy.home}</Link>
      </div>
    </section>
  );
}
