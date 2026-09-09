import type { ReactNode } from "react";
import SiteFooter from "@/components/layout/SiteFooter";
import SiteHeader from "@/components/layout/SiteHeader";
import NewsletterSignup from "@/components/newsletter/NewsletterSignup";
import { getCurrentLocale } from "@/lib/i18n/server";

type PublicLayoutProps = {
  children: ReactNode;
};

export default async function PublicLayout({ children }: PublicLayoutProps) {
  const locale = await getCurrentLocale();
  return (
    <>
      <SiteHeader />
      {children}
      <NewsletterSignup locale={locale} />
      <SiteFooter />
    </>
  );
}
