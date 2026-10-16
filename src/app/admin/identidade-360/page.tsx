import Link from "next/link";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
export const dynamic = "force-dynamic";
const SIZE = 40;
export default async function IdentityCatalog({ searchParams }: { searchParams: Promise<{ q?: string; estado?: string; pagina?: string }> }) {
  await assertAdminAccess("/admin/identidade-360");
  const params = await searchParams;
  const q = (params.q ?? "").trim().slice(0, 100);
  const status = params.estado === "ready" ? "ready" : params.estado === "draft" ? "draft" : "";
  const requested = Number(params.pagina ?? 1);
  const page = Number.isSafeInteger(requested) && requested > 0 ? Math.min(requested, 10000) : 1;
  const safe = q.replace(/[^\p{L}\p{N}\s-]/gu, " ").trim();
  const admin = createSupabaseAdminClient();
  let query = admin.from("admin_commercial_identity_catalog").select("product_id,public_reference,supplier_reference,supplier_name,translations,review_status", { count: "exact" }).is("deleted_at", null);
  if (status) query = query.eq("review_status", status);
  if (safe) query = query.or(`supplier_reference.ilike.%${safe}%,supplier_name.ilike.%${safe}%,public_reference.ilike.%${safe}%,translations->pt->>name.ilike.%${safe}%`);
  const result = await query.order("supplier_reference").order("product_id").range((page - 1) * SIZE, page * SIZE - 1);
  if (result.error) throw new Error("Não foi possível carregar as correspondências de produtos.");
  const href = (next: number) => `/admin/identidade-360?${new URLSearchParams({ q, estado: status, pagina: String(next) })}`;
  return <main className="min-h-screen bg-neutral-50 px-4 py-8 sm:px-6"><div className="mx-auto max-w-7xl">
    <Link href="/admin/produtos" className="text-sm underline">Voltar aos produtos</Link>
    <h1 className="mt-6 text-3xl font-semibold">Identidade 360</h1>
    <p className="mt-3 max-w-3xl text-neutral-600">Correspondência interna entre o catálogo do fornecedor e os nomes da 360. As referências são permanentes. Os nomes preparados aqui ainda não são publicados na loja.</p>
    <form className="my-6 flex flex-wrap gap-3"><label className="sr-only" htmlFor="identity-search">Pesquisar por referência ou nome</label>
      <input id="identity-search" name="q" defaultValue={q} placeholder="Referência do fornecedor, referência 360 ou nome" className="min-w-0 flex-1 rounded-xl border bg-white p-3" />
      <label className="sr-only" htmlFor="identity-state">Estado de revisão</label><select id="identity-state" name="estado" defaultValue={status} className="rounded-xl border bg-white p-3"><option value="">Todos os estados</option><option value="draft">Em preparação</option><option value="ready">Nomes revistos</option></select>
      <button className="rounded-xl bg-neutral-950 px-5 py-3 text-white">Pesquisar</button>
    </form>
    <p className="mb-3 text-sm text-neutral-600">{result.count ?? 0} produtos · Página {page}</p>
    <div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full text-left text-sm"><thead className="bg-neutral-100"><tr>{["Referência fornecedor", "Nome original", "Referência 360", "Nome 360 (PT)", "Revisão", ""].map((label, i) => <th key={i} className="p-4">{label}</th>)}</tr></thead>
      <tbody>{(result.data ?? []).map(row => <tr key={row.product_id} className="border-t"><td className="p-4">{row.supplier_reference}</td><td className="max-w-xs p-4">{row.supplier_name}</td><td className="whitespace-nowrap p-4 font-mono text-xs">{row.public_reference}</td><td className="p-4">{row.translations?.pt?.name || "Por definir"}</td><td className="p-4">{row.review_status === "ready" ? "Revisto" : "Em preparação"}</td><td className="p-4"><Link className="font-semibold underline" href={`/admin/identidade-360/${row.product_id}`}>Editar</Link></td></tr>)}</tbody></table>
      {!result.data?.length && <p className="p-6">Não foram encontrados produtos.</p>}
    </div><nav aria-label="Paginação" className="mt-6 flex justify-between">{page > 1 ? <Link href={href(page - 1)}>Anterior</Link> : <span />}{page * SIZE < (result.count ?? 0) && <Link href={href(page + 1)}>Seguinte</Link>}</nav>
  </div></main>;
}
