import type { ReactNode } from "react";
import { NOINDEX_METADATA } from "@/lib/seo/noindex";

export const metadata = NOINDEX_METADATA;

type NoIndexLayoutProps = {
  children: ReactNode;
};

export default function NoIndexLayout({ children }: NoIndexLayoutProps) {
  return children;
}
