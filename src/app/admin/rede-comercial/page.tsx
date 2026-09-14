import Link from "next/link";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { countryName } from "@/lib/sales/i18n";
import type { SalesAgent } from "@/lib/sales/types";
import AgentForm from "@/components/sales/AgentForm";
import { Panel, inputClass } from "@/components/sales/Fields";
export const dynamic = "force-dynamic";
export default async function SalesAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; pagina?: string }>;
}) {
  await assertAdminAccess("/admin/rede-comercial");
  const params = await searchParams;
  const q = (params.q || "")
    .trim()
    .replace(/[%_,()]/g, "")
    .slice(0, 100);
  const page = Math.max(1, Math.min(10000, Number(params.pagina) || 1));
  let query = createSupabaseAdminClient()
    .from("sales_agents")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * 50, page * 50 - 1);
  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
  const { data, count, error } = await query.returns<SalesAgent[]>();
  if (error) throw new Error("Não foi possível carregar a rede comercial.");
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-9 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/admin" className="text-sm text-slate-500 hover:underline">
          ← Voltar ao backoffice
        </Link>
        <div className="my-8 rounded-3xl bg-[#162334] p-7 text-white sm:p-9">
          <p className="text-xs uppercase tracking-[.2em] text-orange-300">
            360 Merchandising
          </p>
          <h1 className="mt-3 text-3xl font-semibold">Rede Comercial</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            Comerciais por país, carteiras de clientes e comissões. Cria a
            ficha, define as condições e envia o convite para a área privada.
          </p>
        </div>
        <div className="space-y-7">
          <Panel title={`Comerciais · ${count ?? 0}`}>
            <form className="mb-6 flex max-w-lg gap-2">
              <input
                aria-label="Pesquisar comercial"
                className={inputClass}
                name="q"
                defaultValue={q}
                placeholder="Nome ou email"
              />
              <button className="rounded-xl border border-slate-300 px-4 text-sm font-semibold">
                Pesquisar
              </button>
            </form>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {(data ?? []).map((a) => (
                <Link
                  key={a.id}
                  href={`/admin/rede-comercial/${a.id}`}
                  className="rounded-2xl border border-slate-200 p-5 transition hover:border-orange-400 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-semibold">{a.full_name}</h2>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs">
                      {
                        {
                          draft: "Rascunho",
                          invited: "Convidado",
                          active: "Ativo",
                          suspended: "Suspenso",
                        }[a.status]
                      }
                    </span>
                  </div>
                  <p className="mt-2 break-all text-sm text-slate-500">
                    {a.email}
                  </p>
                  <p className="mt-4 text-sm">
                    {a.countries.map((c) => countryName(c)).join(" · ")}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {a.commission_enabled
                      ? "Comissões ativas"
                      : "Comissões por configurar"}
                  </p>
                </Link>
              ))}
            </div>
            {!count && (
              <p className="text-sm text-slate-500">
                Ainda não existem comerciais. Cria a primeira ficha abaixo.
              </p>
            )}
            <div className="mt-5 flex gap-4 text-sm">
              {page > 1 && (
                <Link href={`?q=${encodeURIComponent(q)}&pagina=${page - 1}`}>
                  ← Anterior
                </Link>
              )}
              {page * 50 < (count ?? 0) && (
                <Link href={`?q=${encodeURIComponent(q)}&pagina=${page + 1}`}>
                  Seguinte →
                </Link>
              )}
            </div>
          </Panel>
          <Panel title="Novo comercial">
            <AgentForm />
          </Panel>
        </div>
      </div>
    </main>
  );
}
