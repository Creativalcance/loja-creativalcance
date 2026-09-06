import { redirect } from "next/navigation";
import { localizePath } from "@/lib/i18n/config";
import { getCurrentLocale } from "@/lib/i18n/server";

export default async function ProductIndexPage() {
  const locale = await getCurrentLocale();
  redirect(localizePath("/categorias", locale));
}
