import type { ReactNode } from "react";
import { NOINDEX_METADATA } from "@/lib/seo/noindex";
import { assertSalesAccess } from "@/lib/sales/access";
export const metadata = NOINDEX_METADATA;
export const dynamic = "force-dynamic";
export default async function SalesLayout({
  children,
}: {
  children: ReactNode;
}) {
  await assertSalesAccess();
  return children;
}
