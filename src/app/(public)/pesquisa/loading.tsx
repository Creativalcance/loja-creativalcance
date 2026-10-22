import { getCurrentLocale } from "@/lib/i18n/server";
import { catalogNavigationCopy } from "@/components/catalog/navigation-copy";

export default async function CatalogLoading() {
  const locale = await getCurrentLocale();
  return (
    <section className="mx-auto max-w-7xl px-6 py-16" aria-busy="true">
      <p role="status" className="text-lg font-semibold text-[#162334]">{catalogNavigationCopy[locale].loading}</p>
      <div aria-hidden="true" className="mt-8 grid grid-cols-2 gap-6 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="h-72 rounded-3xl bg-neutral-100 motion-safe:animate-pulse" />
        ))}
      </div>
    </section>
  );
}
