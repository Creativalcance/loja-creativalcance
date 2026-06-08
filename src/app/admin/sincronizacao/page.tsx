import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Box,
  CheckCircle2,
  Clock,
  Database,
  Layers,
  PackageSearch,
  ServerCog,
  XCircle,
} from "lucide-react";
import StrickerSyncProductsButton from "@/components/admin/StrickerSyncProductsButton";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Supplier = {
  id: string;
  name: string;
  slug: string;
  status: string;
  integration_type: string;
  last_synced_at: string | null;
  is_active: boolean;
};

type SyncBatch = {
  id: string;
  sync_type: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  total_records: number;
  successful_records: number;
  failed_records: number;
  error_message: string | null;
};

type IntegrationLog = {
  id: string;
  level: string;
  event_type: string;
  message: string;
  created_at: string;
};

type Profile = {
  role: string;
};

type CatalogStats = {
  productsCount: number;
  variantsCount: number;
  imagesCount: number;
  pricesCount: number;
  stocksCount: number;
  techniquesCount: number;
};

function formatDate(value: string | null): string {
  if (!value) {
    return "Ainda sem registo";
  }

  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "Pendente",
    running: "Em execução",
    success: "Concluído",
    partial_success: "Parcial",
    failed: "Falhou",
    cancelled: "Cancelado",
    active: "Activo",
    inactive: "Inactivo",
    paused: "Pausado",
    error: "Erro",
  };

  return labels[status] ?? status;
}

function getStatusClassName(status: string): string {
  if (status === "success" || status === "active") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (status === "partial_success" || status === "running") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  if (status === "failed" || status === "error" || status === "inactive") {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  return "bg-neutral-100 text-neutral-700 ring-neutral-200";
}

function getStatusIcon(status: string) {
  if (status === "success" || status === "active") {
    return CheckCircle2;
  }

  if (status === "failed" || status === "error") {
    return XCircle;
  }

  if (status === "running" || status === "pending") {
    return Clock;
  }

  return AlertTriangle;
}

async function getCatalogStats(
  supplierId: string | null,
): Promise<CatalogStats> {
  const supabase = await createSupabaseServerClient();

  if (!supplierId) {
    return {
      productsCount: 0,
      variantsCount: 0,
      imagesCount: 0,
      pricesCount: 0,
      stocksCount: 0,
      techniquesCount: 0,
    };
  }

  const [
    productsResult,
    variantsResult,
    imagesResult,
    pricesResult,
    stocksResult,
    techniquesResult,
  ] = await Promise.all([
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("supplier_id", supplierId),
    supabase
      .from("product_variants")
      .select("id", { count: "exact", head: true })
      .eq("supplier_id", supplierId),
    supabase
      .from("product_images")
      .select("id", { count: "exact", head: true })
      .eq("supplier_id", supplierId),
    supabase
      .from("product_prices")
      .select("id", { count: "exact", head: true })
      .eq("supplier_id", supplierId),
    supabase
      .from("product_stocks")
      .select("id", { count: "exact", head: true })
      .eq("supplier_id", supplierId),
    supabase
      .from("printing_techniques")
      .select("id", { count: "exact", head: true })
      .eq("supplier_id", supplierId),
  ]);

  return {
    productsCount: productsResult.count ?? 0,
    variantsCount: variantsResult.count ?? 0,
    imagesCount: imagesResult.count ?? 0,
    pricesCount: pricesResult.count ?? 0,
    stocksCount: stocksResult.count ?? 0,
    techniquesCount: techniquesResult.count ?? 0,
  };
}

export default async function AdminSyncPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="min-h-screen bg-neutral-50 px-6 py-12">
        <section className="mx-auto max-w-3xl rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-950">
            Acesso reservado
          </h1>

          <p className="mt-4 text-neutral-600">
            É necessário iniciar sessão com uma conta administrativa para aceder
            à sincronização de fornecedores.
          </p>

          <Link
  href="/login"
  className="mt-8 inline-flex w-full max-w-[220px] items-center justify-center rounded-xl border border-neutral-300 bg-white px-6 py-3 text-sm font-semibold text-neutral-950 shadow-sm transition hover:border-neutral-950 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:ring-offset-2"
>
  Iniciar sessão
</Link>
        </section>
      </main>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    return (
      <main className="min-h-screen bg-neutral-50 px-6 py-12">
        <section className="mx-auto max-w-3xl rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-950">
            Sem permissões
          </h1>

          <p className="mt-4 text-neutral-600">
            A sua conta não tem permissões administrativas para consultar esta
            área.
          </p>

          <Link
  href="/admin"
  className="mt-8 inline-flex w-full max-w-[220px] items-center justify-center rounded-xl border border-neutral-300 bg-white px-6 py-3 text-sm font-semibold text-neutral-950 shadow-sm transition hover:border-neutral-950 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:ring-offset-2"
>
  Voltar ao admin
</Link>
        </section>
      </main>
    );
  }

  const { data: supplier } = await supabase
    .from("suppliers")
    .select(
      "id, name, slug, status, integration_type, last_synced_at, is_active",
    )
    .eq("slug", "stricker")
    .single<Supplier>();

  const supplierId = supplier?.id ?? null;

  const batchesPromise = supplierId
    ? supabase
        .from("sync_batches")
        .select(
          "id, sync_type, status, started_at, finished_at, total_records, successful_records, failed_records, error_message",
        )
        .eq("supplier_id", supplierId)
        .order("started_at", { ascending: false })
        .limit(10)
        .returns<SyncBatch[]>()
    : Promise.resolve({ data: [] as SyncBatch[], error: null });

  const lastBatchPromise = supplierId
    ? supabase
        .from("sync_batches")
        .select(
          "id, sync_type, status, started_at, finished_at, total_records, successful_records, failed_records, error_message",
        )
        .eq("supplier_id", supplierId)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle<SyncBatch>()
    : Promise.resolve({ data: null as SyncBatch | null, error: null });

  const logsPromise = supplierId
    ? supabase
        .from("integration_logs")
        .select("id, level, event_type, message, created_at")
        .eq("supplier_id", supplierId)
        .order("created_at", { ascending: false })
        .limit(10)
        .returns<IntegrationLog[]>()
    : Promise.resolve({ data: [] as IntegrationLog[], error: null });

  const [{ data: lastBatch }, { data: batches }, { data: logs }, stats] =
    await Promise.all([
      lastBatchPromise,
      batchesPromise,
      logsPromise,
      getCatalogStats(supplierId),
    ]);

  const safeBatches: SyncBatch[] = batches ?? [];
  const safeLogs: IntegrationLog[] = logs ?? [];

  const StatusIcon = getStatusIcon(supplier?.status ?? "inactive");
  const LastBatchIcon = getStatusIcon(lastBatch?.status ?? "pending");

  const statCards = [
    {
      label: "Produtos",
      value: stats.productsCount,
      icon: PackageSearch,
    },
    {
      label: "Variantes",
      value: stats.variantsCount,
      icon: Layers,
    },
    {
      label: "Imagens",
      value: stats.imagesCount,
      icon: Box,
    },
    {
      label: "Preços",
      value: stats.pricesCount,
      icon: Database,
    },
    {
      label: "Stocks",
      value: stats.stocksCount,
      icon: ServerCog,
    },
    {
      label: "Técnicas",
      value: stats.techniquesCount,
      icon: CheckCircle2,
    },
  ];

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
              Sincronização Stricker
            </h1>

            <p className="mt-4 max-w-3xl text-neutral-600">
              Gestão técnica da integração com o fornecedor principal da
              plataforma. Aqui pode acompanhar produtos, batches de sincronização
              e logs operacionais.
            </p>
          </div>

          <StrickerSyncProductsButton />
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-neutral-500">Fornecedor</p>
                <h2 className="mt-2 text-2xl font-semibold text-neutral-950">
                  {supplier?.name ?? "Stricker"}
                </h2>
              </div>

              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getStatusClassName(
                  supplier?.status ?? "inactive",
                )}`}
              >
                <StatusIcon className="mr-1.5 h-3.5 w-3.5" />
                {getStatusLabel(supplier?.status ?? "inactive")}
              </span>
            </div>

            <dl className="mt-6 space-y-4 text-sm">
              <div>
                <dt className="text-neutral-500">Integração</dt>
                <dd className="mt-1 font-medium text-neutral-950">
                  {supplier?.integration_type ?? "stricker_rest"}
                </dd>
              </div>

              <div>
                <dt className="text-neutral-500">Última sincronização</dt>
                <dd className="mt-1 font-medium text-neutral-950">
                  {formatDate(supplier?.last_synced_at ?? null)}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-neutral-500">Último batch</p>
                <h2 className="mt-2 text-2xl font-semibold text-neutral-950">
                  {lastBatch
                    ? getStatusLabel(lastBatch.status)
                    : "Sem sincronizações"}
                </h2>
              </div>

              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getStatusClassName(
                  lastBatch?.status ?? "pending",
                )}`}
              >
                <LastBatchIcon className="mr-1.5 h-3.5 w-3.5" />
                {getStatusLabel(lastBatch?.status ?? "pending")}
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-4">
              <div>
                <p className="text-sm text-neutral-500">Tipo</p>
                <p className="mt-1 font-semibold text-neutral-950">
                  {lastBatch?.sync_type ?? "-"}
                </p>
              </div>

              <div>
                <p className="text-sm text-neutral-500">Total</p>
                <p className="mt-1 font-semibold text-neutral-950">
                  {lastBatch?.total_records ?? 0}
                </p>
              </div>

              <div>
                <p className="text-sm text-neutral-500">Sucesso</p>
                <p className="mt-1 font-semibold text-emerald-700">
                  {lastBatch?.successful_records ?? 0}
                </p>
              </div>

              <div>
                <p className="text-sm text-neutral-500">Falhas</p>
                <p className="mt-1 font-semibold text-red-700">
                  {lastBatch?.failed_records ?? 0}
                </p>
              </div>
            </div>

            {lastBatch?.error_message ? (
              <div className="mt-6 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
                {lastBatch.error_message}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-6">
          {statCards.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm"
              >
                <Icon className="h-5 w-5 text-neutral-500" />
                <p className="mt-5 text-sm text-neutral-500">{item.label}</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight text-neutral-950">
                  {item.value.toLocaleString("pt-PT")}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-10 grid gap-6 xl:grid-cols-2">
          <section className="rounded-3xl border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-200 p-6">
              <h2 className="text-xl font-semibold text-neutral-950">
                Histórico de sincronizações
              </h2>
              <p className="mt-2 text-sm text-neutral-500">
                Últimos batches registados para o fornecedor Stricker.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-neutral-50 text-neutral-500">
                  <tr>
                    <th className="px-6 py-4 font-medium">Tipo</th>
                    <th className="px-6 py-4 font-medium">Estado</th>
                    <th className="px-6 py-4 font-medium">Total</th>
                    <th className="px-6 py-4 font-medium">Sucesso</th>
                    <th className="px-6 py-4 font-medium">Falhas</th>
                    <th className="px-6 py-4 font-medium">Início</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-neutral-100">
                  {safeBatches.length > 0 ? (
                    safeBatches.map((batch: SyncBatch) => (
                      <tr key={batch.id}>
                        <td className="px-6 py-4 font-medium text-neutral-950">
                          {batch.sync_type}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${getStatusClassName(
                              batch.status,
                            )}`}
                          >
                            {getStatusLabel(batch.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-neutral-700">
                          {batch.total_records}
                        </td>
                        <td className="px-6 py-4 text-emerald-700">
                          {batch.successful_records}
                        </td>
                        <td className="px-6 py-4 text-red-700">
                          {batch.failed_records}
                        </td>
                        <td className="px-6 py-4 text-neutral-700">
                          {formatDate(batch.started_at)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-8 text-center text-neutral-500"
                      >
                        Ainda não existem sincronizações registadas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-3xl border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-200 p-6">
              <h2 className="text-xl font-semibold text-neutral-950">
                Logs recentes
              </h2>
              <p className="mt-2 text-sm text-neutral-500">
                Últimos eventos técnicos da integração Stricker.
              </p>
            </div>

            <div className="divide-y divide-neutral-100">
              {safeLogs.length > 0 ? (
                safeLogs.map((log: IntegrationLog) => (
                  <article key={log.id} className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                            log.level === "error" || log.level === "critical"
                              ? "bg-red-50 text-red-700 ring-red-200"
                              : log.level === "warning"
                                ? "bg-amber-50 text-amber-700 ring-amber-200"
                                : "bg-neutral-100 text-neutral-700 ring-neutral-200"
                          }`}
                        >
                          {log.level}
                        </span>

                        <h3 className="mt-3 font-semibold text-neutral-950">
                          {log.event_type}
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-neutral-600">
                          {log.message}
                        </p>
                      </div>

                      <time className="shrink-0 text-xs text-neutral-400">
                        {formatDate(log.created_at)}
                      </time>
                    </div>
                  </article>
                ))
              ) : (
                <div className="p-8 text-center text-sm text-neutral-500">
                  Ainda não existem logs técnicos.
                </div>
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}