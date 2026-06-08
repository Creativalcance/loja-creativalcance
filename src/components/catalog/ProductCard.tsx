import Link from "next/link";
import { ArrowRight, CheckCircle2, Star } from "lucide-react";

export type ProductCardImage = {
  external_url: string | null;
  storage_url: string | null;
  alt_text: string | null;
  is_primary: boolean;
  sort_order: number;
};

export type ProductCardPrice = {
  final_price: number;
  quantity_min: number;
  currency: string;
};

export type ProductCardStock = {
  available_quantity: number;
};

export type ProductCardProduct = {
  id: string;
  sku: string;
  name: string;
  slug: string;
  short_description: string | null;
  material: string | null;
  is_featured: boolean;
  is_customizable: boolean;
  min_order_quantity: number;
  product_images: ProductCardImage[] | null;
  product_prices: ProductCardPrice[] | null;
  product_stocks: ProductCardStock[] | null;
};

type ProductCardProps = {
  product: ProductCardProduct;
};

function formatPrice(value: number, currency: string): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency,
  }).format(value);
}

function getPrimaryImage(product: ProductCardProduct): ProductCardImage | null {
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

function getBestPrice(product: ProductCardProduct): ProductCardPrice | null {
  const prices = product.product_prices ?? [];

  if (prices.length === 0) {
    return null;
  }

  return prices.sort((a, b) => a.quantity_min - b.quantity_min)[0] ?? null;
}

function getTotalStock(product: ProductCardProduct): number {
  return (product.product_stocks ?? []).reduce(
    (total, stock) => total + stock.available_quantity,
    0,
  );
}

export default function ProductCard({ product }: ProductCardProps) {
  const primaryImage = getPrimaryImage(product);
  const imageUrl = primaryImage?.storage_url ?? primaryImage?.external_url;
  const bestPrice = getBestPrice(product);
  const totalStock = getTotalStock(product);

  return (
    <Link
      href={`/produto/${product.slug}`}
      className="group overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="aspect-square bg-neutral-100">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={primaryImage?.alt_text ?? product.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-6 text-center text-sm text-neutral-400">
            Sem imagem disponível
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-400">
            {product.sku}
          </p>

          {product.is_featured ? (
            <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
              <Star className="mr-1 h-3 w-3" />
              Destaque
            </span>
          ) : null}
        </div>

        <h2 className="mt-3 line-clamp-2 text-lg font-semibold tracking-tight text-neutral-950">
          {product.name}
        </h2>

        {product.short_description ? (
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-neutral-600">
            {product.short_description}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          {product.is_customizable ? (
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Personalizável
            </span>
          ) : null}

          {product.material ? (
            <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-600 ring-1 ring-neutral-200">
              {product.material}
            </span>
          ) : null}
        </div>

        <div className="mt-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs text-neutral-500">
              Desde {product.min_order_quantity.toLocaleString("pt-PT")} un.
            </p>

            <p className="mt-1 text-lg font-semibold text-neutral-950">
              {bestPrice
                ? formatPrice(bestPrice.final_price, bestPrice.currency)
                : "Sob consulta"}
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs text-neutral-500">Stock</p>
            <p className="mt-1 text-sm font-semibold text-neutral-950">
              {totalStock.toLocaleString("pt-PT")}
            </p>
          </div>
        </div>

        <span className="mt-6 inline-flex items-center text-sm font-semibold text-neutral-950">
          Ver produto
          <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}