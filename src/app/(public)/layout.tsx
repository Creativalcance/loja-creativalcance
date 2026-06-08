import type { ReactNode } from "react";
import SiteHeader from "@/components/layout/SiteHeader";

type PublicLayoutProps = {
  children: ReactNode;
};

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <>
      <SiteHeader />
      {children}
    </>
  );
}