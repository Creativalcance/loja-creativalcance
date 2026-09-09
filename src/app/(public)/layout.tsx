import type { ReactNode } from "react";
import SiteFooter from "@/components/layout/SiteFooter";
import SiteHeader from "@/components/layout/SiteHeader";
import NewsletterPlacement from "@/components/newsletter/NewsletterPlacement";
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
      <NewsletterPlacement locale={locale} />
      <SiteFooter />
    </>
  );
}
