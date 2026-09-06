import { ArrowLeft } from "lucide-react";
import { localizePath, type SiteLocale } from "@/lib/i18n/config";
import { customerCopy } from "@/lib/i18n/account";

export default function CustomerDashboardLink({ locale }: { locale: SiteLocale }) {
  return (
    <a
      href={localizePath("/area-cliente", locale)}
      className="inline-flex items-center rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:border-neutral-950 hover:text-neutral-950"
    >
      <ArrowLeft className="mr-2 h-4 w-4" />
      {customerCopy[locale].dashboard}
    </a>
  );
}
