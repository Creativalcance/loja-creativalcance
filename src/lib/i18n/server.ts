import { headers } from "next/headers";
import { getSiteLocale, type SiteLocale } from "@/lib/i18n/config";

export async function getCurrentLocale(): Promise<SiteLocale> {
  const requestHeaders = await headers();
  return getSiteLocale(requestHeaders.get("x-site-locale"));
}
