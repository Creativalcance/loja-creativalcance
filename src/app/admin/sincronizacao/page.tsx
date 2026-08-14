import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Database,
} from "lucide-react";
import StrickerSyncActions from "@/components/admin/StrickerSyncActions";
import StrickerRestCatalogSyncActions from "@/components/admin/StrickerRestCatalogSyncActions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import StrickerManualImportForm from "@/components/admin/StrickerManualImportForm";
import NormalizeManualImportButton from "@/components/admin/NormalizeManualImportButton";
import RunningSynchronizations from "@/components/admin/RunningSynchronizations";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Profile = {
  role: string;
};

type DatasetImport = {
  id: string;
  dataset_name: string;
  language: string | null;
  country: string | null;
  extension: string;
  status: string;
  records_received: number;
  records_imported: number;
  records_failed: number;
  source_url: string | null;
  errors: unknown;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  supplier_manual_import_files:
    | {
        id: string;
      }[]
    | null;
};

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
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
    success: "Sucesso",
    partial_success: "Sucesso parcial",
    failed: "Falhou",
    canceled: "Cancelada",
  };

  return labels[status] ?? status;
}

function getStatusClassName(status: string): string {
  if (status === "success") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (status === "partial_success") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  if (status === "failed" || status === "canceled") {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  return "bg-neutral-100 text-neutral-700 ring-neutral-200";
}

function getErrorsPreview(errors: unknown): string {
  if (!Array.isArray(errors) || errors.length === 0) {
    return "—";
  }

  return errors
    .slice(0, 3)
    .map((error) => {
      if (typeof error === "string") {
        return error;
      }

      try {
        return JSON.stringify(error);
      } catch {
        return String(error);
      }
    })
    .join(" | ");
}

async function assertAdminPageAccess(): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin/sincronizacao");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (!profile || profile.role !== "admin") {
    redirect("/");
  }
}

export default async function AdminSyncPage() {
  await assertAdminPageAccess();

  const supabaseAdmin = createSupabaseAdminClient();

  const [
    { data: importsData },
    { count: successfulCount },
    { count: partialSuccessCount },
    { count: failedCount },
    { count: runningCount },
  ] = await Promise.all([
    supabaseAdmin
      .from("supplier_dataset_imports")
      .select(
        `
        id,
        dataset_name,
        language,
        country,
        extension,
        status,
        records_received,
        records_imported,
        records_failed,
        source_url,
        errors,
        started_at,
        finished_at,
        created_at,
        supplier_manual_import_files (
          id
        )
      `,
      )
      .order("created_at", { ascending: false })
      .limit(15)
      .returns<DatasetImport[]>(),
    supabaseAdmin
      .from("supplier_dataset_imports")
      .select("id", { count: "exact", head: true })
      .eq("status", "success"),
    supabaseAdmin
      .from("supplier_dataset_imports")
      .select("id", { count: "exact", head: true })
      .eq("status", "partial_success"),
    supabaseAdmin
      .from("supplier_dataset_imports")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed"),
    supabaseAdmin
      .from("supplier_dataset_imports")
      .select("id", { count: "exact", head: true })
      .eq("status", "running"),
  ]);

  const imports = importsData ?? [];
  const successfulImports =
    (successfulCount ?? 0) + (partialSuccessCount ?? 0);
  const failedImports = failedCount ?? 0;
  const runningImports = runningCount ?? 0;

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-10">
      <section className="mx-auto max-w-7xl">
        <Link
          href="/admin"
          className="inline-flex items-center text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao admin
        </Link>

        <div className="mt-8 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
              Administração
            </p>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-950">
              Sincronização
            </h1>

            <p className="mt-4 max-w-3xl text-neutral-600">
              Gestão de integrações com fornecedores, importação de datasets,
              diagnóstico de ligação e histórico de sincronizações.
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <article className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <CheckCircle2 className="h-7 w-7 text-emerald-600" />

            <p className="mt-6 text-sm text-neutral-500">
              Importações com sucesso
            </p>

            <p className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950">
              {successfulImports.toLocaleString("pt-PT")}
            </p>
          </article>

          <article className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <Clock3 className="h-7 w-7 text-amber-600" />

            <p className="mt-6 text-sm text-neutral-500">Em execução</p>

            <p className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950">
              {runningImports.toLocaleString("pt-PT")}
            </p>
          </article>

          <article className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <AlertCircle className="h-7 w-7 text-red-600" />

            <p className="mt-6 text-sm text-neutral-500">Falhadas</p>

            <p className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950">
              {failedImports.toLocaleString("pt-PT")}
            </p>
          </article>
        </div>

        <div className="mt-10 grid gap-6">
          <RunningSynchronizations />
          <StrickerSyncActions />
          <StrickerRestCatalogSyncActions />
          <StrickerManualImportForm />
        </div>

        <section className="mt-10 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
                Histórico
              </p>

              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950">
                Últimas importações
              </h2>
            </div>

            <Database className="h-6 w-6 text-neutral-400" />
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-xs uppercase tracking-[0.14em] text-neutral-500">
                  <th className="px-4 py-3 font-medium">Dataset</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Âmbito</th>
                  <th className="px-4 py-3 font-medium">Recebidos</th>
                  <th className="px-4 py-3 font-medium">Importados</th>
                  <th className="px-4 py-3 font-medium">Falhados</th>
                  <th className="px-4 py-3 font-medium">Início</th>
                  <th className="px-4 py-3 font-medium">Fim</th>
                  <th className="px-4 py-3 font-medium">Acções</th>
                  <th className="px-4 py-3 font-medium">Erros</th>
                </tr>
              </thead>

              <tbody>
                {imports.length > 0 ? (
                  imports.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-neutral-100 last:border-0"
                    >
                      <td className="px-4 py-4 font-medium text-neutral-950">
                        {item.dataset_name}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getStatusClassName(
                            item.status,
                          )}`}
                        >
                          {getStatusLabel(item.status)}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-neutral-600">
                        {[item.language, item.country, item.extension]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </td>

                      <td className="px-4 py-4 text-neutral-600">
                        {item.records_received.toLocaleString("pt-PT")}
                      </td>

                      <td className="px-4 py-4 text-neutral-600">
                        {item.records_imported.toLocaleString("pt-PT")}
                      </td>

                      <td className="px-4 py-4 text-neutral-600">
                        {item.records_failed.toLocaleString("pt-PT")}
                      </td>

                      <td className="px-4 py-4 text-neutral-600">
                        {formatDate(item.started_at)}
                      </td>

                      <td className="px-4 py-4 text-neutral-600">
                        {formatDate(item.finished_at)}
                      </td>

                      <td className="px-4 py-4">
                        <NormalizeManualImportButton
                          importFileId={
                            item.supplier_manual_import_files?.[0]?.id ?? null
                          }
                          datasetName={item.dataset_name}
                        />
                      </td>

                      <td className="max-w-xs px-4 py-4 text-xs leading-5 text-neutral-500">
                        {getErrorsPreview(item.errors)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-12 text-center text-neutral-500"
                    >
                      Ainda não existem importações registadas.
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
