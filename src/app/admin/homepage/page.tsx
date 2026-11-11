import Link from "next/link";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { homepageSchema } from "@/lib/homepage/config";
import HomepageEditor from "./HomepageEditor";

export const dynamic = "force-dynamic";
export default async function HomepageAdminPage() {
  await assertAdminAccess("/admin/homepage");
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("homepage_settings").select("config,version").eq("id", "main").single();
  const parsed = homepageSchema.safeParse(data?.config);
  if (error || !parsed.success) return <main className="mx-auto max-w-5xl p-8"><Link href="/admin">← Administração</Link><h1 className="mt-6 text-3xl font-semibold">Homepage</h1><p role="alert" className="mt-5">Não foi possível carregar a configuração. Tenta novamente dentro de instantes.</p></main>;
  const ids = parsed.data.campaign.productIds;
  const products = ids.length ? await admin.from("products").select("id,name,sku,status,is_purchasable").in("id", ids) : { data: [], error: null };
  if (products.error) throw new Error("Não foi possível carregar os produtos selecionados.");
  return <main className="min-h-screen bg-neutral-50 px-4 py-8 text-[#162334] sm:px-6">
    <div className="mx-auto max-w-6xl">
      <Link href="/admin" className="text-sm font-semibold text-neutral-600">← Administração</Link>
      <div className="my-8 flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-3xl font-semibold">Homepage</h1><p className="mt-3 max-w-2xl leading-6 text-neutral-600">Escolhe o que aparece na página inicial e em que ordem. Guarda para publicar as alterações nos seis idiomas.</p></div>
        <Link href="/" target="_blank" rel="noopener noreferrer" className="rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm font-semibold">Ver homepage ↗</Link>
      </div>
      <HomepageEditor initialConfig={parsed.data} initialVersion={data.version} initialProducts={products.data ?? []} />
    </div>
  </main>;
}
