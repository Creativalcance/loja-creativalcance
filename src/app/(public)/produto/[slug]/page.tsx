import Link from "next/link";
import { notFound } from "next/navigation";
import AddToCartForm from "@/components/product/AddToCartForm";
import {
  ArrowLeft,
  CheckCircle2,
  Package,
  Palette,
  Truck,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ProductImage = {
  external_url: string | null;
  storage_url: string | null;
  alt_text: string | null;
  is_primary: boolean;
  sort_order: number;
};

type ProductPrice = {
  final_price: number;
  supplier_price: number;
  quantity_min: number;
  quantity_max: number | null;
  currency: string;
};

type ProductStock = {
  available_quantity: number;
  incoming_quantity: number;
  expected_restock_date: string | null;
};

type ProductVariantForCart = {
  id: string;
  sku: string;
  color_name: string | null;
  color_hex: string | null;
  size: string | null;
};

type PrintingTechniqueForCart = {
  id: string;
  name: string;
  setup_cost: number | null;
  price_per_unit: number | null;
};

type ProductVariant = {
  id: string;
  sku: string;
  color_name: string | null;
  color_hex: string | null;
  size: string | null;
  material: string | null;
};

type ProductTechnique = {
  print_area_name: string | null;
  position: string | null;
  printing_techniques: {
    name: string;
    description: string | null;
    supports_full_color: boolean;
    max_colors: number | null;
  } | null;
};

type ProductDetail = {
  id: string;
  sku: string;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  brand: string | null;
  material: string | null;
  dimensions: string | null;
  weight: number | null;
  country_of_origin: string | null;
  min_order_quantity: number;
  lead_time_days: number | null;
  is_customizable: boolean;
  product_images: ProductImage[] | null;
  product_prices: ProductPrice[] | null;
  product_stocks: ProductStock[] | null;
  product_variants: ProductVariant[] | null;
  product_printing_techniques: ProductTechnique[] | null;
};

type ProductPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function formatPrice(value: number, currency: string): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency,
  }).format(value);
}

function getPrimaryImage(product: ProductDetail): ProductImage | null {
  const images = product.product_images ?? [];

  if (images.length === 0) {
    return null;
  }

  return (
    images.find((image) => image.is_primary) ??
    images.sort((a, b) => a.sort_order - b.sort_order)[0] ??
    null
  );
}

function getTotalStock(product: ProductDetail): number {
  return (product.product_stocks ?? []).reduce(
    (total, stock) => total + stock.available_quantity,
    0,
  );
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("products")
    .select(
      `
        id,
        sku,
        name,
        slug,
        short_description,
        description,
        brand,
        material,
        dimensions,
        weight,
        country_of_origin,
        min_order_quantity,
        lead_time_days,
        is_customizable,
        product_images (
          external_url,
          storage_url,
          alt_text,
          is_primary,
          sort_order
        ),
        product_prices (
          final_price,
          supplier_price,
          quantity_min,
          quantity_max,
          currency
        ),
        product_stocks (
          available_quantity,
          incoming_quantity,
          expected_restock_date
        ),
        product_variants (
          sku,
          color_name,
          color_hex,
          size,
          material
        ),
        product_printing_techniques (
          print_area_name,
          position,
          printing_techniques (
            name,
            description,
            supports_full_color,
            max_colors
          )
        )
      `,
    )
    .eq("slug", slug)
    .eq("status", "active")
    .eq("is_active", true)
    .maybeSingle();

  if (!data) {
    notFound();
  }

  const product = data as unknown as ProductDetail;
  const primaryImage = getPrimaryImage(product);
  const imageUrl = primaryImage?.storage_url ?? primaryImage?.external_url;
  const prices = [...(product.product_prices ?? [])].sort(
    (a, b) => a.quantity_min - b.quantity_min,
  );
  const variants = product.product_variants ?? [];
  const techniques = product.product_printing_techniques ?? [];
  const totalStock = getTotalStock(product);
const { data: activeTechniquesData } = await supabase
  .from("printing_techniques")
  .select("id, name, setup_cost, price_per_unit")
  .eq("is_active", true)
  .order("name", { ascending: true });

const activeTechniques =
  (activeTechniquesData ?? []) as PrintingTechniqueForCart[];

const cartVariants = variants.map((variant) => ({
  id: variant.id,
  sku: variant.sku,
  color_name: variant.color_name,
  color_hex: variant.color_hex,
  size: variant.size,
}));

const cartPrices = prices.map((price) => ({
  quantity_min: price.quantity_min,
  quantity_max: price.quantity_max,
  final_price: price.final_price,
  currency: price.currency,
}));
  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-12">
      <section className="mx-auto max-w-7xl">
        <Link
          href="/pesquisa"
          className="inline-flex items-center text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar à pesquisa
        </Link>

        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.8fr)]">
          <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
            <div className="aspect-square bg-neutral-100">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={primaryImage?.alt_text ?? product.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-neutral-400">
                  Sem imagem disponível
                </div>
              )}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
              {product.sku}
            </p>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-950">
              {product.name}
            </h1>

            {product.short_description ? (
              <p className="mt-5 text-lg leading-8 text-neutral-600">
                {product.short_description}
              </p>
            ) : null}

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
                <Package className="h-5 w-5 text-neutral-500" />
                <p className="mt-4 text-sm text-neutral-500">Quantidade mín.</p>
                <p className="mt-1 font-semibold text-neutral-950">
                  {product.min_order_quantity.toLocaleString("pt-PT")} un.
                </p>
              </div>

              <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
                <Truck className="h-5 w-5 text-neutral-500" />
                <p className="mt-4 text-sm text-neutral-500">Stock</p>
                <p className="mt-1 font-semibold text-neutral-950">
                  {totalStock.toLocaleString("pt-PT")} un.
                </p>
              </div>

              <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
                <Palette className="h-5 w-5 text-neutral-500" />
                <p className="mt-4 text-sm text-neutral-500">Personalização</p>
                <p className="mt-1 font-semibold text-neutral-950">
                  {product.is_customizable ? "Disponível" : "Sob consulta"}
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-neutral-950">
                Escalões de preço
              </h2>

              {prices.length > 0 ? (
                <div className="mt-5 divide-y divide-neutral-100">
                  {prices.map((price) => (
                    <div
                      key={`${price.quantity_min}-${price.quantity_max ?? "plus"}`}
                      className="flex items-center justify-between gap-4 py-3"
                    >
                      <p className="text-sm text-neutral-600">
                        {price.quantity_min.toLocaleString("pt-PT")}
                        {price.quantity_max
                          ? ` a ${price.quantity_max.toLocaleString("pt-PT")}`
                          : "+"}{" "}
                        unidades
                      </p>

                      <p className="font-semibold text-neutral-950">
                        {formatPrice(price.final_price, price.currency)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-neutral-600">
                  Preço sob consulta.
                </p>
              )}
            </div>

            <AddToCartForm
  productId={product.id}
  productSku={product.sku}
  productName={product.name}
  minimumQuantity={product.min_order_quantity}
  prices={cartPrices}
  variants={cartVariants}
  printingTechniques={activeTechniques}
/>
          </div>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-neutral-950">
              Descrição
            </h2>

            <p className="mt-4 leading-8 text-neutral-600">
              {product.description ??
                "Produto disponível para orçamento e personalização."}
            </p>

            <dl className="mt-8 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-neutral-500">Marca</dt>
                <dd className="mt-1 font-medium text-neutral-950">
                  {product.brand ?? "—"}
                </dd>
              </div>

              <div>
                <dt className="text-neutral-500">Material</dt>
                <dd className="mt-1 font-medium text-neutral-950">
                  {product.material ?? "—"}
                </dd>
              </div>

              <div>
                <dt className="text-neutral-500">Dimensões</dt>
                <dd className="mt-1 font-medium text-neutral-950">
                  {product.dimensions ?? "—"}
                </dd>
              </div>

              <div>
                <dt className="text-neutral-500">Peso</dt>
                <dd className="mt-1 font-medium text-neutral-950">
                  {product.weight ? `${product.weight} kg` : "—"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-neutral-950">
              Variantes e personalização
            </h2>

            {variants.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {variants.map((variant) => (
                  <span
                    key={variant.sku}
                    className="inline-flex items-center rounded-full bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-700 ring-1 ring-neutral-200"
                  >
                    {variant.color_hex ? (
                      <span
                        className="mr-2 h-3 w-3 rounded-full border border-neutral-300"
                        style={{ backgroundColor: variant.color_hex }}
                      />
                    ) : null}
                    {variant.color_name ?? variant.size ?? variant.sku}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-neutral-600">
                Sem variantes registadas.
              </p>
            )}

            <div className="mt-8">
              <h3 className="font-semibold text-neutral-950">
                Técnicas disponíveis
              </h3>

              {techniques.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {techniques.map((technique, index) => (
                    <div
                      key={`${technique.printing_techniques?.name ?? "tecnica"}-${index}`}
                      className="rounded-2xl border border-neutral-200 p-4"
                    >
                      <p className="font-semibold text-neutral-950">
                        {technique.printing_techniques?.name ??
                          "Técnica sob consulta"}
                      </p>

                      {technique.printing_techniques?.description ? (
                        <p className="mt-2 text-sm leading-6 text-neutral-600">
                          {technique.printing_techniques.description}
                        </p>
                      ) : null}

                      <div className="mt-3 flex flex-wrap gap-2">
                        {technique.printing_techniques?.supports_full_color ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Full color
                          </span>
                        ) : null}

                        {technique.position ? (
                          <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-600 ring-1 ring-neutral-200">
                            {technique.position}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-neutral-600">
                  Técnicas de personalização sob consulta.
                </p>
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}