import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Package,
  Palette,
  Search,
} from "lucide-react";
import AdminPriceEditForm from "@/components/admin/pricing/AdminPriceEditForm";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PricingMode } from "@/lib/pricing/calculate-selling-price";
import { applyBulkMarginAction, revertBulkMarginAction } from "./actions";

export const dynamic = "force-dynamic";

type PricingTab = "produtos" | "personalizacoes";

type ProductPriceDatabaseRow = {
  id: string;
  product_id: string;
  variant_id: string | null;
  supplier_id: string;
  currency: string;
  quantity_min: number;
  quantity_max: number | null;
  supplier_price: number;
  base_price: number;
  margin_percentage: number | null;
  markup_percentage: number | null;
  fixed_markup: number | null;
  manual_price: number | null;
  final_price: number;
  pricing_mode: PricingMode;
  is_manual_override: boolean;
  override_reason: string | null;
  override_updated_at: string | null;
};

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  type_name: string | null;
};

type ProductVariantRow = {
  id: string;
  sku: string;
  color_name: string | null;
  size: string | null;
};

type ProductPriceViewRow = ProductPriceDatabaseRow & {
  product: ProductRow | null;
  variant: ProductVariantRow | null;
};

type PrintingPriceViewRow = {
  id: string;
  external_id: string;
  table_code: string;
  table_code_option: string | null;
  technique_code: string | null;
  technique_name: string | null;
  currency: string;
  quantity_min: number;
  quantity_max: number | null;
  supplier_price: number;
  handling_cost: number;
  supplier_handling_cost: number;
  handling_margin_rate: number | null;
  handling_markup_rate: number | null;
  handling_pricing_mode: PricingMode;
  handling_manual_price: number | null;
  handling_is_manual_override: boolean;
  handling_override_reason: string | null;
  base_price: number;
  margin_percentage: number | null;
  markup_percentage: number | null;
  fixed_markup: number | null;
  manual_price: number | null;
  final_price: number;
  pricing_mode: PricingMode;
  is_manual_override: boolean;
  override_reason: string | null;
  override_updated_at: string | null;
};

type AdminPricesPageProps = {
  searchParams?: Promise<{
    tab?: string;
    q?: string;
    pagina?: string;
    sucesso?: string;
    erro?: string;
  }>;
};

const PAGE_SIZE = 30;

function formatPrice(
  value: number,
  currency = "EUR",
): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency,
  }).format(value);
}

function formatPercentage(value: number): string {
  return new Intl.NumberFormat("pt-PT", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

function getQuantityLabel(params: {
  quantityMin: number;
  quantityMax: number | null;
}): string {
  if (params.quantityMax !== null) {
    return `${params.quantityMin.toLocaleString(
      "pt-PT",
    )}–${params.quantityMax.toLocaleString("pt-PT")}`;
  }

  return `${params.quantityMin.toLocaleString("pt-PT")}+`;
}

function getVariantLabel(
  variant: ProductVariantRow | null,
): string {
  if (!variant) {
    return "Preço geral do produto";
  }

  const values = [
    variant.color_name,
    variant.size,
  ].filter(Boolean);

  return values.length > 0
    ? values.join(" · ")
    : variant.sku;
}

function getPricingModeLabel(mode: PricingMode): string {
  switch (mode) {
    case "margin":
      return "Margem";

    case "markup":
      return "Markup";

    case "fixed_markup":
      return "Valor fixo";

    case "manual":
      return "Manual";

    case "automatic":
    default:
      return "Automático";
  }
}

function calculateEffectiveMargin(params: {
  costPrice: number;
  finalPrice: number;
}): number {
  if (params.finalPrice <= 0) {
    return 0;
  }

  return (
    ((params.finalPrice - params.costPrice) /
      params.finalPrice) *
    100
  );
}

function calculateProfit(params: {
  costPrice: number;
  finalPrice: number;
}): number {
  return params.finalPrice - params.costPrice;
}

function buildPageHref(params: {
  tab: PricingTab;
  query: string;
  page: number;
}): string {
  const searchParams = new URLSearchParams();

  searchParams.set("tab", params.tab);

  if (params.query) {
    searchParams.set("q", params.query);
  }

  searchParams.set("pagina", String(params.page));

  return `/admin/precos?${searchParams.toString()}`;
}

async function getProductIdsBySearch(
  query: string,
): Promise<string[]> {
  if (!query) {
    return [];
  }

  const supabaseAdmin = createSupabaseAdminClient();

  const safeQuery = query
    .replace(/[%_(),]/g, " ")
    .trim();

  if (!safeQuery) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from("products")
    .select("id")
    .or(
      `name.ilike.%${safeQuery}%,sku.ilike.%${safeQuery}%`,
    )
    .limit(500)
    .returns<Array<{ id: string }>>();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((product) => product.id);
}

async function getProductPriceRows(params: {
  query: string;
  page: number;
}): Promise<{
  rows: ProductPriceViewRow[];
  count: number;
}> {
  const supabaseAdmin = createSupabaseAdminClient();

  const from = (params.page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const productIds = params.query
    ? await getProductIdsBySearch(params.query)
    : [];

  if (params.query && productIds.length === 0) {
    return {
      rows: [],
      count: 0,
    };
  }

  let priceQuery = supabaseAdmin
    .from("product_prices")
    .select(
      `
        id,
        product_id,
        variant_id,
        supplier_id,
        currency,
        quantity_min,
        quantity_max,
        supplier_price,
        base_price,
        margin_percentage,
        markup_percentage,
        fixed_markup,
        manual_price,
        final_price,
        pricing_mode,
        is_manual_override,
        override_reason,
        override_updated_at
      `,
      {
        count: "exact",
      },
    )
    .order("product_id", {
      ascending: true,
    })
    .order("quantity_min", {
      ascending: true,
    })
    .range(from, to);

  if (productIds.length > 0) {
    priceQuery = priceQuery.in(
      "product_id",
      productIds,
    );
  }

  const {
    data: priceRows,
    error: priceError,
    count,
  } = await priceQuery.returns<ProductPriceDatabaseRow[]>();

  if (priceError) {
    throw new Error(priceError.message);
  }

  const productPriceRows = priceRows ?? [];

  const uniqueProductIds = Array.from(
    new Set(
      productPriceRows.map((row) => row.product_id),
    ),
  );

  const uniqueVariantIds = Array.from(
    new Set(
      productPriceRows
        .map((row) => row.variant_id)
        .filter(
          (value): value is string => Boolean(value),
        ),
    ),
  );

  const productsById = new Map<string, ProductRow>();
  const variantsById = new Map<string, ProductVariantRow>();

  if (uniqueProductIds.length > 0) {
    const { data, error } = await supabaseAdmin
      .from("products")
      .select(
        "id,name,slug,sku,type_name",
      )
      .in("id", uniqueProductIds)
      .returns<ProductRow[]>();

    if (error) {
      throw new Error(error.message);
    }

    for (const product of data ?? []) {
      productsById.set(product.id, product);
    }
  }

  if (uniqueVariantIds.length > 0) {
    const { data, error } = await supabaseAdmin
      .from("product_variants")
      .select(
        "id,sku,color_name,size",
      )
      .in("id", uniqueVariantIds)
      .returns<ProductVariantRow[]>();

    if (error) {
      throw new Error(error.message);
    }

    for (const variant of data ?? []) {
      variantsById.set(variant.id, variant);
    }
  }

  return {
    rows: productPriceRows.map((row) => ({
      ...row,
      product:
        productsById.get(row.product_id) ?? null,
      variant: row.variant_id
        ? variantsById.get(row.variant_id) ?? null
        : null,
    })),
    count: count ?? 0,
  };
}

async function getPrintingPriceRows(params: {
  query: string;
  page: number;
}): Promise<{
  rows: PrintingPriceViewRow[];
  count: number;
}> {
  const supabaseAdmin = createSupabaseAdminClient();

  const from = (params.page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const safeQuery = params.query
    .replace(/[%_(),]/g, " ")
    .trim();

  let query = supabaseAdmin
    .from("printing_price_tables")
    .select(
      `
        id,
        external_id,
        table_code,
        table_code_option,
        technique_code,
        technique_name,
        currency,
        quantity_min,
        quantity_max,
        supplier_price,
        handling_cost,
        supplier_handling_cost,
        handling_margin_rate,
        handling_markup_rate,
        handling_pricing_mode,
        handling_manual_price,
        handling_is_manual_override,
        handling_override_reason,
        base_price,
        margin_percentage,
        markup_percentage,
        fixed_markup,
        manual_price,
        final_price,
        pricing_mode,
        is_manual_override,
        override_reason,
        override_updated_at
      `,
      {
        count: "exact",
      },
    )
    .eq("is_active", true)
    .order("technique_name", {
      ascending: true,
    })
    .order("table_code", {
      ascending: true,
    })
    .order("quantity_min", {
      ascending: true,
    })
    .range(from, to);

  if (safeQuery) {
    query = query.or(
      [
        `technique_name.ilike.%${safeQuery}%`,
        `technique_code.ilike.%${safeQuery}%`,
        `table_code.ilike.%${safeQuery}%`,
        `table_code_option.ilike.%${safeQuery}%`,
      ].join(","),
    );
  }

  const {
    data,
    error,
    count,
  } = await query.returns<PrintingPriceViewRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return {
    rows: data ?? [],
    count: count ?? 0,
  };
}

export default async function AdminPricesPage({
  searchParams,
}: AdminPricesPageProps) {
  await assertAdminAccess("/admin/precos");
  const resolvedSearchParams = await searchParams;

  const activeTab: PricingTab =
    resolvedSearchParams?.tab ===
    "personalizacoes"
      ? "personalizacoes"
      : "produtos";

  const query =
    resolvedSearchParams?.q
      ?.trim()
      .slice(0, 80) ?? "";

  const requestedPage = Number(
    resolvedSearchParams?.pagina ?? 1,
  );

  const page =
    Number.isFinite(requestedPage) &&
    requestedPage > 0
      ? Math.floor(requestedPage)
      : 1;

  const result =
    activeTab === "produtos"
      ? await getProductPriceRows({
          query,
          page,
        })
      : await getPrintingPriceRows({
          query,
          page,
        });

  const supabaseAdmin = createSupabaseAdminClient();
  const { data: bulkBatches } = await supabaseAdmin
    .from("bulk_price_change_batches")
    .select("id,target_type,margin_percentage,affected_rows,status,created_at")
    .eq("status", "applied")
    .order("created_at", { ascending: false })
    .limit(5)
    .returns<Array<{id:string;target_type:string;margin_percentage:number;affected_rows:number;status:string;created_at:string}>>();
  const latestBulkBatch = (bulkBatches ?? []).find((batch) => batch.target_type === (activeTab === "produtos" ? "products" : "personalizations"));

  const totalPages = Math.max(
    1,
    Math.ceil(result.count / PAGE_SIZE),
  );

  const productRows =
    activeTab === "produtos"
      ? (result.rows as ProductPriceViewRow[])
      : [];

  const printingRows =
    activeTab === "personalizacoes"
      ? (result.rows as PrintingPriceViewRow[])
      : [];

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-10">
      <section className="mx-auto max-w-[1600px]">
        <Link href="/admin" className="mb-6 inline-flex items-center text-sm font-medium text-neutral-600 hover:text-neutral-950">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao dashboard admin
        </Link>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Backoffice
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950">
              Gestão de preços
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">
              Compare o custo original importado do
              fornecedor com o preço apresentado pela
              360 Merchandising e altere a regra comercial
              aplicada a cada escalão.
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <div className="flex items-start gap-2">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />

              <p>
                Os valores apresentados no front utilizam
                o campo <strong>final_price</strong>.
                O custo original permanece guardado em{" "}
                <strong>supplier_price</strong>.
              </p>
            </div>
          </div>
        </div>

        {resolvedSearchParams?.sucesso ? <div className="mt-6 rounded-2xl bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-800">Alteração global concluída com sucesso.</div> : null}
        {resolvedSearchParams?.erro ? <div className="mt-6 rounded-2xl bg-red-50 px-5 py-4 text-sm font-medium text-red-800">Não foi possível concluir a alteração global. Confirme a margem indicada.</div> : null}

        <section className="mt-8 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.14em] text-neutral-500">Ação global</p>
              <h2 className="mt-2 text-xl font-semibold text-neutral-950">Aplicar a mesma margem a {activeTab === "produtos" ? "todos os produtos" : "todas as personalizações"}</h2>
              <p className="mt-2 max-w-3xl text-sm text-neutral-600">A alteração guarda uma cópia dos valores anteriores e pode ser revertida. O transporte não é incluído nem recebe margem.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <form action={applyBulkMarginAction} className="flex gap-2">
                <input type="hidden" name="target" value={activeTab === "produtos" ? "products" : "personalizations"} />
                <label className="sr-only" htmlFor="global-margin">Margem global</label>
                <div className="relative"><input id="global-margin" name="margin" type="number" min="0" max="94.99" step="0.01" required placeholder="35" className="w-32 rounded-2xl border border-neutral-300 px-4 py-3 pr-9 text-sm"/><span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-neutral-500">%</span></div>
                <button className="rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white">Aplicar a todos</button>
              </form>
              {latestBulkBatch ? <form action={revertBulkMarginAction}><input type="hidden" name="batchId" value={latestBulkBatch.id}/><button className="h-full rounded-2xl border border-neutral-300 px-5 py-3 text-sm font-semibold">Reverter última ação</button></form> : null}
            </div>
          </div>
          {latestBulkBatch ? <p className="mt-4 text-xs text-neutral-500">Última ação activa: margem de {Number(latestBulkBatch.margin_percentage).toLocaleString("pt-PT")}% aplicada a {latestBulkBatch.affected_rows.toLocaleString("pt-PT")} preços.</p> : null}
        </section>

        <div className="mt-8 flex flex-col gap-4 rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/precos?tab=produtos"
              className={`inline-flex items-center rounded-2xl px-5 py-3 text-sm font-semibold transition ${
                activeTab === "produtos"
                  ? "bg-neutral-950 text-white"
                  : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              }`}
            >
              <Package className="mr-2 h-4 w-4" />
              Produtos
            </Link>

            <Link
              href="/admin/precos?tab=personalizacoes"
              className={`inline-flex items-center rounded-2xl px-5 py-3 text-sm font-semibold transition ${
                activeTab === "personalizacoes"
                  ? "bg-neutral-950 text-white"
                  : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              }`}
            >
              <Palette className="mr-2 h-4 w-4" />
              Personalizações
            </Link>
          </div>

          <form
            action="/admin/precos"
            method="get"
            className="flex w-full gap-2 lg:max-w-xl"
          >
            <input
              type="hidden"
              name="tab"
              value={activeTab}
            />

            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />

              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder={
                  activeTab === "produtos"
                    ? "Pesquisar por produto ou referência"
                    : "Pesquisar técnica ou tabela"
                }
                className="w-full rounded-2xl border border-neutral-300 bg-white py-3 pl-11 pr-4 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
              />
            </div>

            <button
              type="submit"
              className="rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              Pesquisar
            </button>
          </form>
        </div>

        <div className="mt-6 flex items-center justify-between text-sm text-neutral-500">
          <p>
            {result.count.toLocaleString("pt-PT")}{" "}
            preços encontrados
          </p>

          <p>
            Página {page} de {totalPages}
          </p>
        </div>

        {activeTab === "produtos" ? (
          <div className="mt-4 space-y-4">
            {productRows.map((row) => {
              const costPrice = row.supplier_price;

              const effectiveMargin =
                calculateEffectiveMargin({
                  costPrice,
                  finalPrice: row.final_price,
                });

              const profit = calculateProfit({
                costPrice,
                finalPrice: row.final_price,
              });

              const isBelowCost =
                row.final_price < costPrice;

              return (
                <article
                  key={row.id}
                  className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm"
                >
                  <div className="grid gap-5 p-5 xl:grid-cols-[minmax(280px,1.5fr)_150px_150px_150px_150px_150px] xl:items-center">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                        {row.product?.type_name ??
                          "Produto"}
                      </p>

                      <h2 className="mt-2 text-base font-semibold text-neutral-950">
                        {row.product?.name ??
                          "Produto sem identificação"}
                      </h2>

                      <p className="mt-1 text-sm text-neutral-500">
                        {getVariantLabel(row.variant)}
                      </p>

                      <p className="mt-2 text-xs text-neutral-400">
                        Escalão:{" "}
                        {getQuantityLabel({
                          quantityMin:
                            row.quantity_min,
                          quantityMax:
                            row.quantity_max,
                        })}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-[0.12em] text-neutral-500">
                        Fornecedor
                      </p>

                      <p className="mt-1 font-semibold text-neutral-950">
                        {formatPrice(
                          row.supplier_price,
                          row.currency,
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-[0.12em] text-neutral-500">
                        360 Merchandising
                      </p>

                      <p
                        className={`mt-1 font-semibold ${
                          isBelowCost
                            ? "text-red-600"
                            : "text-neutral-950"
                        }`}
                      >
                        {formatPrice(
                          row.final_price,
                          row.currency,
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-[0.12em] text-neutral-500">
                        Margem real
                      </p>

                      <p
                        className={`mt-1 font-semibold ${
                          effectiveMargin < 15
                            ? "text-amber-600"
                            : "text-emerald-700"
                        }`}
                      >
                        {formatPercentage(
                          effectiveMargin,
                        )}
                        %
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-[0.12em] text-neutral-500">
                        Lucro/un.
                      </p>

                      <p
                        className={`mt-1 font-semibold ${
                          profit < 0
                            ? "text-red-600"
                            : "text-neutral-950"
                        }`}
                      >
                        {formatPrice(
                          profit,
                          row.currency,
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-[0.12em] text-neutral-500">
                        Regra
                      </p>

                      <span
                        className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          row.is_manual_override
                            ? "bg-blue-50 text-blue-700"
                            : "bg-neutral-100 text-neutral-700"
                        }`}
                      >
                        {getPricingModeLabel(
                          row.pricing_mode,
                        )}
                      </span>
                    </div>
                  </div>

                  <details className="border-t border-neutral-200">
                    <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-50">
                      Editar preço deste escalão
                    </summary>

                    <div className="border-t border-neutral-200 bg-neutral-50 p-5">
                      <div className="mx-auto max-w-4xl rounded-3xl border border-neutral-200 bg-white p-6">
                        <AdminPriceEditForm
                          entityType="product_price"
                          entityId={row.id}
                          currentMode={
                            row.pricing_mode
                          }
                          supplierPrice={
                            row.supplier_price
                          }
                          finalPrice={
                            row.final_price
                          }
                          marginPercentage={
                            row.margin_percentage
                          }
                          markupPercentage={
                            row.markup_percentage
                          }
                          fixedMarkup={
                            row.fixed_markup
                          }
                          manualPrice={
                            row.manual_price
                          }
                          overrideReason={
                            row.override_reason
                          }
                        />
                      </div>
                    </div>
                  </details>

                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {printingRows.map((row) => {
              const costPrice = row.supplier_price;

              const effectiveMargin =
                calculateEffectiveMargin({
                  costPrice,
                  finalPrice: row.final_price,
                });

              const profit = calculateProfit({
                costPrice,
                finalPrice: row.final_price,
              });

              const isBelowCost =
                row.final_price < costPrice;

              return (
                <article
                  key={row.id}
                  className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm"
                >
                  <div className="grid gap-5 p-5 xl:grid-cols-[minmax(280px,1.5fr)_150px_150px_150px_150px_150px] xl:items-center">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                        {row.technique_code ??
                          "Personalização"}
                      </p>

                      <h2 className="mt-2 text-base font-semibold text-neutral-950">
                        {row.technique_name ??
                          row.table_code}
                      </h2>

                      <p className="mt-1 text-sm text-neutral-500">
                        Tabela: {row.table_code}
                        {row.table_code_option
                          ? ` · ${row.table_code_option}`
                          : ""}
                      </p>

                      <p className="mt-2 text-xs text-neutral-400">
                        Escalão:{" "}
                        {getQuantityLabel({
                          quantityMin:
                            row.quantity_min,
                          quantityMax:
                            row.quantity_max,
                        })}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-[0.12em] text-neutral-500">
                        Fornecedor
                      </p>

                      <p className="mt-1 font-semibold text-neutral-950">
                        {formatPrice(
                          row.supplier_price,
                          row.currency,
                        )}
                      </p>

                      {row.handling_cost > 0 ? (
                        <p className="mt-1 text-xs text-neutral-500">
                          +{" "}
                          {formatPrice(
                            row.handling_cost,
                            row.currency,
                          )}{" "}
                          manuseamento
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-[0.12em] text-neutral-500">
                        360 Merchandising
                      </p>

                      <p
                        className={`mt-1 font-semibold ${
                          isBelowCost
                            ? "text-red-600"
                            : "text-neutral-950"
                        }`}
                      >
                        {formatPrice(
                          row.final_price,
                          row.currency,
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-[0.12em] text-neutral-500">
                        Margem real
                      </p>

                      <p
                        className={`mt-1 font-semibold ${
                          effectiveMargin < 15
                            ? "text-amber-600"
                            : "text-emerald-700"
                        }`}
                      >
                        {formatPercentage(
                          effectiveMargin,
                        )}
                        %
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-[0.12em] text-neutral-500">
                        Lucro/un.
                      </p>

                      <p
                        className={`mt-1 font-semibold ${
                          profit < 0
                            ? "text-red-600"
                            : "text-neutral-950"
                        }`}
                      >
                        {formatPrice(
                          profit,
                          row.currency,
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-[0.12em] text-neutral-500">
                        Regra
                      </p>

                      <span
                        className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          row.is_manual_override
                            ? "bg-blue-50 text-blue-700"
                            : "bg-neutral-100 text-neutral-700"
                        }`}
                      >
                        {getPricingModeLabel(
                          row.pricing_mode,
                        )}
                      </span>
                    </div>
                  </div>

                  <details className="border-t border-neutral-200">
                    <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-50">
                      Editar preço desta personalização
                    </summary>

                    <div className="border-t border-neutral-200 bg-neutral-50 p-5">
                      <div className="mx-auto max-w-4xl rounded-3xl border border-neutral-200 bg-white p-6">
                        <AdminPriceEditForm
                          entityType="printing_price"
                          entityId={row.id}
                          currentMode={
                            row.pricing_mode
                          }
                          supplierPrice={
                            row.supplier_price
                          }
                          handlingCost={
                            row.handling_cost
                          }
                          finalPrice={
                            row.final_price
                          }
                          marginPercentage={
                            row.margin_percentage
                          }
                          markupPercentage={
                            row.markup_percentage
                          }
                          fixedMarkup={
                            row.fixed_markup
                          }
                          manualPrice={
                            row.manual_price
                          }
                          overrideReason={
                            row.override_reason
                          }
                        />
                      </div>
                    </div>
                  </details>
                  {row.handling_cost > 0 || row.supplier_handling_cost > 0 ? (
                    <details className="border-t border-neutral-200">
                      <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-50">
                        Editar preço do setup
                      </summary>
                      <div className="border-t border-neutral-200 bg-neutral-50 p-5">
                        <div className="mx-auto max-w-4xl rounded-3xl border border-neutral-200 bg-white p-6">
                          <AdminPriceEditForm
                            entityType="printing_setup"
                            entityId={row.id}
                            currentMode={row.handling_pricing_mode ?? "automatic"}
                            supplierPrice={row.supplier_handling_cost ?? 0}
                            finalPrice={row.handling_cost ?? 0}
                            marginPercentage={(row.handling_margin_rate ?? 0.3) * 100}
                            markupPercentage={row.handling_markup_rate === null ? null : row.handling_markup_rate * 100}
                            fixedMarkup={null}
                            manualPrice={row.handling_manual_price}
                            overrideReason={row.handling_override_reason}
                          />
                        </div>
                      </div>
                    </details>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}

        {result.rows.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-neutral-300 bg-white p-12 text-center">
            <h2 className="text-lg font-semibold text-neutral-950">
              Nenhum preço encontrado
            </h2>

            <p className="mt-2 text-sm text-neutral-600">
              Altere os termos de pesquisa ou confirme se
              os dados do fornecedor já foram sincronizados.
            </p>
          </div>
        ) : null}

        {totalPages > 1 ? (
          <nav className="mt-8 flex items-center justify-center gap-3">
            {page > 1 ? (
              <Link
                href={buildPageHref({
                  tab: activeTab,
                  query,
                  page: page - 1,
                })}
                className="inline-flex items-center rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-700 transition hover:border-neutral-400"
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Anterior
              </Link>
            ) : null}

            <span className="rounded-2xl bg-neutral-950 px-4 py-3 text-sm font-semibold text-white">
              {page} / {totalPages}
            </span>

            {page < totalPages ? (
              <Link
                href={buildPageHref({
                  tab: activeTab,
                  query,
                  page: page + 1,
                })}
                className="inline-flex items-center rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-700 transition hover:border-neutral-400"
              >
                Seguinte
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            ) : null}
          </nav>
        ) : null}
      </section>
    </main>
  );
}
