import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  PackageSearch,
  Search,
  Star,
  XCircle,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AdminProduct = {
  id: string;
  sku: string;
  name: string;
  slug: string;
  short_description: string | null;
  status: string;
  is_active: boolean;
  is_featured: boolean;
  is_customizable: boolean;
  min_order_quantity: number;
  updated_at: string;
  suppliers: {
    name: string;
    slug: string;
  } | null;
};

type Profile = {
  role: string;
};

type AdminProductsPageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
  }>;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: "Activo",
    inactive: "Inactivo",
    draft: "Rascunho",
    archived: "Arquivado",
  };

  return labels[status] ?? status;
}

function getStatusClassName(status: string, isActive: boolean): string {
  if (!isActive || status === "inactive" || status === "archived") {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  if (status === "draft") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  return "bg-emerald-50 text-emerald-700 ring-emerald-200";
}

export default async function AdminProductsPage({
  searchParams,
}: AdminProductsPageProps) {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams?.q?.trim() ?? "";
  const status = resolvedSearchParams?.status?.trim() ?? "";

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    redirect("/");
  }

  let productsQuery = supabase
  .from("products")
  .select(
    `
      id,
      sku,
      name,
      slug,
      short_description,
      status,
      is_active,
      is_featured,
      is_customizable,
      min_order_quantity,
      updated_at,
      suppliers (
        name,
        slug
      )
    `,
    { count: "exact" },
  )
  .order("updated_at", { ascending: false })
  .limit(50);

if (query) {
  productsQuery = productsQuery.or(
    `name.ilike.%${query}%,sku.ilike.%${query}%,short_description.ilike.%${query}%`,
  );
}

if (status) {
  productsQuery = productsQuery.eq("status", status);
}

const { data: products, count } = await productsQuery;

const safeProducts = (products ?? []) as unknown as AdminProduct[];
  const totalProducts = count ?? 0;

  const [{ count: activeCount }, { count: inactiveCount }, { count: featuredCount }] =
    await Promise.all([
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .eq("is_active", true),
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .or("status.eq.inactive,is_active.eq.false"),
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("is_featured", true),
    ]);

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-10">
      <section className="mx-auto max-w-7xl">
        <Link
          href="/admin"
          className="inline-flex items-center text-sm font-medium text-neutral-600 transition hover:text-neutral-950"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao admin
        </Link>

        <div className="mt-8 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
              Administração
            </p>

            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-neutral-950">
              Produtos
            </h1>

            <p className="mt-4 max-w-3xl text-neutral-600">
              Gestão do catálogo de produtos da Loja Creativ. Aqui serão
              apresentados os produtos sincronizados a partir da Stricker e de
              futuros fornecedores.
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <PackageSearch className="h-6 w-6 text-neutral-500" />
            <p className="mt-5 text-sm text-neutral-500">Total listado</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-neutral-950">
              {totalProducts.toLocaleString("pt-PT")}
            </p>
          </div>

          <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            <p className="mt-5 text-sm text-neutral-500">Produtos activos</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-neutral-950">
              {(activeCount ?? 0).toLocaleString("pt-PT")}
            </p>
          </div>

          <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <Star className="h-6 w-6 text-amber-600" />
            <p className="mt-5 text-sm text-neutral-500">Em destaque</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-neutral-950">
              {(featuredCount ?? 0).toLocaleString("pt-PT")}
            </p>
          </div>
        </div>

        <section className="mt-8 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <form className="grid gap-4 lg:grid-cols-[1fr_220px_auto]" action="/admin/produtos">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />

              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Pesquisar por nome, SKU ou descrição"
                className="w-full rounded-2xl border border-neutral-300 bg-white py-3 pl-11 pr-4 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
              />
            </div>

            <select
              name="status"
              defaultValue={status}
              className="rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
            >
              <option value="">Todos os estados</option>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              <option value="draft">Rascunho</option>
              <option value="archived">Arquivado</option>
            </select>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-2xl bg-neutral-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              Filtrar
            </button>
          </form>

          {inactiveCount && inactiveCount > 0 ? (
            <div className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Existem {inactiveCount.toLocaleString("pt-PT")} produtos
              inactivos ou desactivados no catálogo.
            </div>
          ) : null}
        </section>

        <section className="mt-8 overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-200 p-6">
            <h2 className="text-xl font-semibold text-neutral-950">
              Listagem de produtos
            </h2>

            <p className="mt-2 text-sm text-neutral-500">
              São apresentados até 50 produtos por consulta. A paginação será
              implementada na próxima iteração.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-neutral-50 text-neutral-500">
                <tr>
                  <th className="px-6 py-4 font-medium">Produto</th>
                  <th className="px-6 py-4 font-medium">SKU</th>
                  <th className="px-6 py-4 font-medium">Fornecedor</th>
                  <th className="px-6 py-4 font-medium">Estado</th>
                  <th className="px-6 py-4 font-medium">MOQ</th>
                  <th className="px-6 py-4 font-medium">Personalizável</th>
                  <th className="px-6 py-4 font-medium">Destaque</th>
                  <th className="px-6 py-4 font-medium">Actualizado</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-100">
                {safeProducts.length > 0 ? (
                  safeProducts.map((product) => (
                    <tr key={product.id} className="align-top">
                      <td className="px-6 py-5">
                        <p className="font-semibold text-neutral-950">
                          {product.name}
                        </p>

                        {product.short_description ? (
                          <p className="mt-1 line-clamp-2 max-w-md text-sm leading-6 text-neutral-500">
                            {product.short_description}
                          </p>
                        ) : (
                          <p className="mt-1 text-sm text-neutral-400">
                            Sem descrição curta.
                          </p>
                        )}
                      </td>

                      <td className="px-6 py-5 font-medium text-neutral-700">
                        {product.sku}
                      </td>

                      <td className="px-6 py-5 text-neutral-700">
                        {product.suppliers?.name ?? "Sem fornecedor"}
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${getStatusClassName(
                            product.status,
                            product.is_active,
                          )}`}
                        >
                          {product.is_active ? (
                            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                          ) : (
                            <XCircle className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          {getStatusLabel(product.status)}
                        </span>
                      </td>

                      <td className="px-6 py-5 text-neutral-700">
                        {product.min_order_quantity.toLocaleString("pt-PT")}
                      </td>

                      <td className="px-6 py-5">
                        {product.is_customizable ? (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                            Sim
                          </span>
                        ) : (
                          <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-600 ring-1 ring-neutral-200">
                            Não
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-5">
                        {product.is_featured ? (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                            <Star className="mr-1.5 h-3.5 w-3.5" />
                            Destaque
                          </span>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>

                      <td className="px-6 py-5 text-neutral-700">
                        {formatDate(product.updated_at)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-12 text-center text-neutral-500"
                    >
                      Ainda não existem produtos para apresentar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}