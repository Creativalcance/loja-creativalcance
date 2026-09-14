import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import ManualProductControls from "@/components/admin/manual-products/Controls";
import ManualProductEditForm, {
  type ManualProductEditData,
} from "@/components/admin/manual-products/EditForm";
import { productStatuses } from "@/lib/manual-products/validation";
export const dynamic = "force-dynamic";

export default async function EditManualProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await assertAdminAccess("/admin/produtos");
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const admin = createSupabaseAdminClient();
  const result = await admin
    .from("products")
    .select(
      "id,name,sku,slug,status,updated_at,deleted_at,short_description,description,brand,material,min_order_quantity,lead_time_days,seo_title,seo_description,is_featured",
    )
    .eq("id", id)
    .eq("catalog_source", "manual")
    .eq("fulfillment_route", "internal_360")
    .is("supplier_id", null)
    .maybeSingle<ManualProductEditData>();
  if (result.error) throw new Error("Não foi possível carregar o produto.");
  if (!result.data) notFound();
  const product = result.data;
  const [categories, mappings, prices, stocks, images, changes, variants] =
    await Promise.all([
      admin.from("categories").select("id,name,is_active").order("name"),
      admin
        .from("product_categories")
        .select("category_id,is_primary")
        .eq("product_id", id)
        .order("is_primary", { ascending: false }),
      admin
        .from("product_prices")
        .select("id,final_price,variant_id,supplier_id")
        .eq("product_id", id),
      admin
        .from("product_stocks")
        .select("id,available_quantity,variant_id,supplier_id,warehouse_code")
        .eq("product_id", id),
      admin
        .from("product_images")
        .select("external_url,storage_url")
        .eq("product_id", id)
        .is("variant_id", null)
        .eq("is_primary", true)
        .order("sort_order")
        .limit(1),
      admin
        .from("manual_product_changes")
        .select("id,action,created_at")
        .eq("product_id", id)
        .order("id", { ascending: false })
        .limit(10),
      admin
        .from("product_variants")
        .select("id", { count: "exact", head: true })
        .eq("product_id", id),
    ]);
  if (
    [categories, mappings, prices, stocks, images, changes, variants].some(
      (r) => r.error,
    )
  )
    throw new Error("Não foi possível carregar os dados de gestão do produto.");
  const price = prices.data?.[0];
  const stock = stocks.data?.[0];
  const simple =
    prices.data?.length === 1 &&
    stocks.data?.length === 1 &&
    !variants.count &&
    !price?.variant_id &&
    !price?.supplier_id &&
    !stock?.variant_id &&
    !stock?.supplier_id &&
    stock?.warehouse_code === "360";
  const labels: Record<string, string> = {
    edit: "Dados editados",
    status: "Estado alterado",
    delete: "Produto eliminado",
    restore: "Restaurado como rascunho",
  };
  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Link
          href={`/admin/produtos?origem=manual${product.deleted_at ? "&status=deleted" : ""}`}
          className="text-sm font-medium text-neutral-600"
        >
          ← Produtos 360
        </Link>
        <header className="my-8">
          <p className="text-sm text-neutral-500">
            Produto manual 360 · {product.sku}
          </p>
          <h1 className="mt-2 text-3xl font-semibold">{product.name}</h1>
          <p className="mt-3 text-sm text-neutral-600">
            {product.deleted_at
              ? "Eliminado"
              : (productStatuses[
                  product.status as keyof typeof productStatuses
                ] ?? product.status)}
          </p>
          {!product.deleted_at && product.status === "active" && (
            <Link
              href={`/produto/${product.slug}`}
              className="mt-3 inline-block text-sm underline"
            >
              Ver na loja
            </Link>
          )}
        </header>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          {product.deleted_at ? (
            <section className="rounded-3xl border bg-white p-6">
              <h2 className="text-xl font-semibold">Produto eliminado</h2>
              <p className="mt-3 text-neutral-600">
                Este produto já não está disponível na loja. As encomendas e os
                registos anteriores mantêm-se disponíveis. Restaura-o para
                voltar a editar.
              </p>
            </section>
          ) : simple ? (
            <ManualProductEditForm
              key={product.updated_at}
              product={product}
              categories={categories.data ?? []}
              categoryId={mappings.data?.[0]?.category_id ?? ""}
              price={Number(price?.final_price ?? 0)}
              stock={stock?.available_quantity ?? 0}
              imageUrl={
                images.data?.[0]?.storage_url ??
                images.data?.[0]?.external_url ??
                ""
              }
            />
          ) : (
            <section className="rounded-3xl border bg-white p-6">
              <p>
                Este produto tem variantes, vários escalões ou dados base
                incompletos. A edição simples não está disponível. Podes gerir o
                estado e a eliminação nas ações do produto.
              </p>
            </section>
          )}
          <aside className="space-y-6">
            <section className="rounded-3xl border bg-white p-5">
              <h2 className="mb-4 text-lg font-semibold">Ações do produto</h2>
              <ManualProductControls
                key={product.updated_at}
                product={product}
              />
            </section>
            <section className="rounded-3xl border bg-white p-5">
              <h2 className="text-lg font-semibold">Últimas alterações</h2>
              <ul className="mt-4 space-y-4 text-sm">
                {changes.data?.map((change) => (
                  <li key={change.id}>
                    <p>{labels[change.action] ?? change.action}</p>
                    <time
                      dateTime={change.created_at}
                      className="text-xs text-neutral-500"
                    >
                      {new Intl.DateTimeFormat("pt-PT", {
                        dateStyle: "short",
                        timeStyle: "short",
                        timeZone: "Europe/Lisbon",
                      }).format(new Date(change.created_at))}
                    </time>
                  </li>
                ))}
              </ul>
              {!changes.data?.length && (
                <p className="mt-3 text-sm text-neutral-500">
                  Ainda não existem alterações registadas.
                </p>
              )}
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
