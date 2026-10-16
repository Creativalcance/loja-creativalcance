import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import IdentityForm from "@/components/admin/catalog-identity/IdentityForm";
export const dynamic = "force-dynamic";
export default async function IdentityEditor({ params }: { params: Promise<{ id: string }> }) {
  await assertAdminAccess("/admin/identidade-360");
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const admin = createSupabaseAdminClient();
  const [identity, variants, history] = await Promise.all([
    admin.from("admin_commercial_identity_catalog").select("product_id,public_reference,supplier_reference,supplier_name,translations,review_status,version").eq("product_id", id).is("deleted_at", null).maybeSingle(),
    admin.from("product_variants").select("id,sku,color_name,size,variant_commercial_identities(public_reference)").eq("product_id", id).order("sku"),
    admin.from("product_commercial_identity_changes").select("id,created_at,next_data").eq("product_id", id).order("id", { ascending: false }).limit(10),
  ]);
  if (identity.error || variants.error || history.error) throw new Error("Não foi possível carregar a identidade do produto.");
  if (!identity.data) notFound();
  const row = identity.data;
  return <main className="min-h-screen bg-neutral-50 px-4 py-8 sm:px-6"><div className="mx-auto max-w-5xl">
    <Link href="/admin/identidade-360" className="text-sm underline">Voltar às correspondências</Link>
    <h1 className="mt-6 text-3xl font-semibold">Preparar identidade 360</h1>
    <div className="my-6 rounded-2xl border bg-white p-5"><p className="text-sm text-neutral-500">Original do fornecedor · {row.supplier_reference}</p><p className="mt-1 font-medium">{row.supplier_name}</p><p className="mt-4">Referência 360: <strong className="font-mono">{row.public_reference}</strong></p></div>
    <IdentityForm productId={id} version={row.version} translations={row.translations ?? {}} reviewStatus={row.review_status} />
    <h2 className="mb-3 mt-10 text-xl font-semibold">Correspondência das variantes</h2>
    <div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full text-left text-sm"><thead><tr><th className="p-3">Referência fornecedor</th><th className="p-3">Cor / tamanho</th><th className="p-3">Referência 360</th></tr></thead><tbody>{(variants.data ?? []).map(variant => {
      const identities = variant.variant_commercial_identities;
      const ref = Array.isArray(identities) ? identities[0]?.public_reference : (identities as { public_reference: string } | null)?.public_reference;
      return <tr key={variant.id} className="border-t"><td className="p-3">{variant.sku}</td><td className="p-3">{[variant.color_name, variant.size].filter(Boolean).join(" · ")}</td><td className="p-3 font-mono">{ref ?? "Por preparar"}</td></tr>;
    })}</tbody></table></div>
    <h2 className="mb-3 mt-8 text-xl font-semibold">Últimas alterações</h2>
    <ul className="space-y-2 text-sm text-neutral-600">{(history.data ?? []).map(change => <li key={change.id}>{new Intl.DateTimeFormat("pt-PT", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Lisbon" }).format(new Date(change.created_at))} · Versão {change.next_data.version} · {change.next_data.review_status === "ready" ? "Nomes revistos" : "Em preparação"}</li>)}</ul>
    {!history.data?.length && <p className="text-sm text-neutral-600">Ainda não existem alterações aos nomes.</p>}
  </div></main>;
}
