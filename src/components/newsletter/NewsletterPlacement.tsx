"use client";

import { usePathname } from "next/navigation";
import { type SiteLocale } from "@/lib/i18n/config";
import NewsletterSignup from "@/components/newsletter/NewsletterSignup";

function shouldShowNewsletter(pathname: string): boolean {
  const path = pathname.replace(/^\/(?:en|fr)(?=\/|$)/, "") || "/";

  if (path === "/checkout" || path.startsWith("/checkout/")) {
    return false;
  }

  const segments = path.split("/").filter(Boolean);
  if (segments[0] === "produto" && segments.length >= 2) {
    return false;
  }

  return true;
}

export default function NewsletterPlacement({ locale }: { locale: SiteLocale }) {
  const pathname = usePathname();

  return shouldShowNewsletter(pathname) ? <NewsletterSignup locale={locale} /> : null;
}
