import Link from "next/link";
import type { Metadata } from "next";
import QuoteRequestForm from "@/components/quote/QuoteRequestForm";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { localizePath } from "@/lib/i18n/config";
import { getCurrentLocale } from "@/lib/i18n/server";

type ContactPageProps = {
  searchParams?: Promise<{
    produto?: string;
  }>;
};

type ProductForQuotePage = {
  sku: string;
  name: string;
  min_order_quantity: number;
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();
  const title = locale === "en" ? "Tailored merchandise request" : locale === "fr" ? "Demande de merchandising sur mesure" : "Pedido personalizado";
  const description = locale === "en" ? "Get support for merchandise campaigns, large quantities and specific customisation requirements." : locale === "fr" ? "Obtenez de l’aide pour vos campagnes, grandes quantités et besoins de personnalisation spécifiques." : "Peça apoio para campanhas de merchandising, grandes quantidades, personalizações específicas ou necessidades especiais.";
  return { title, description, alternates: { canonical: localizePath("/contacto", locale) } };
}

export default async function ContactPage({ searchParams }: ContactPageProps) {
  const locale = await getCurrentLocale();
  const copy = locale === "en" ? { back: "Back", eyebrow: "Quotation request", title: "Tell us about your project", intro: "Send us the details and the 360 team will prepare a proposal suited to your quantity, customisation, deadline and campaign objective." } : locale === "fr" ? { back: "Retour", eyebrow: "Demande de devis", title: "Parlez-nous de votre projet", intro: "Envoyez-nous les détails et l’équipe 360 préparera une proposition adaptée à la quantité, à la personnalisation, au délai et à l’objectif de votre campagne." } : { back: "Voltar", eyebrow: "Pedido de orçamento", title: "Fala connosco sobre o teu projeto", intro: "Envia-nos os dados do pedido e a equipa 360 prepara uma proposta ajustada à quantidade, personalização, prazo e objetivo da campanha." };
  const resolvedSearchParams = await searchParams;
  const productSku = resolvedSearchParams?.produto?.trim();

  const supabase = await createSupabaseServerClient();

  let product: ProductForQuotePage | null = null;

  if (productSku) {
    const { data } = await supabase
      .from("products")
      .select("sku, name, min_order_quantity")
      .eq("sku", productSku)
      .eq("status", "active")
      .eq("is_active", true)
      .maybeSingle<ProductForQuotePage>();

    product = data ?? null;
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-12">
      <section className="mx-auto max-w-5xl">
        <Link
          href={localizePath(product ? `/pesquisa?q=${encodeURIComponent(product.sku)}` : "/", locale)}
          className="text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
        >
          ← {copy.back}
        </Link>

        <div className="mt-8 rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm md:p-10">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
            {copy.eyebrow}
          </p>

          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-950">
            {copy.title}
          </h1>

          <p className="mt-4 max-w-3xl text-neutral-600">
            {copy.intro}
          </p>

          <QuoteRequestForm
            locale={locale}
            productSku={product?.sku ?? productSku}
            productName={product?.name}
            minimumQuantity={product?.min_order_quantity ?? 1}
          />
        </div>
      </section>
    </main>
  );
}
