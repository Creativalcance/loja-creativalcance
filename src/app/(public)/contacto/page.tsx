import Link from "next/link";
import type { Metadata } from "next";
import QuoteRequestForm from "@/components/quote/QuoteRequestForm";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

export const metadata: Metadata = {
  title: "Pedido personalizado",
  description:
    "Peça apoio para campanhas de merchandising, grandes quantidades, personalizações específicas ou necessidades especiais.",
  alternates: { canonical: "/contacto" },
};

export default async function ContactPage({ searchParams }: ContactPageProps) {
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
          href={product ? `/pesquisa?q=${encodeURIComponent(product.sku)}` : "/"}
          className="text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
        >
          ← Voltar
        </Link>

        <div className="mt-8 rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm md:p-10">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
            Pedido de orçamento
          </p>

          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-950">
            Fala connosco sobre o teu projecto
          </h1>

          <p className="mt-4 max-w-3xl text-neutral-600">
            Envie-nos os dados do pedido e a equipa 360 prepara uma
            proposta ajustada à quantidade, personalização, prazo e objectivo da
            campanha.
          </p>

          <QuoteRequestForm
            productSku={product?.sku ?? productSku}
            productName={product?.name}
            minimumQuantity={product?.min_order_quantity ?? 1}
          />
        </div>
      </section>
    </main>
  );
}
