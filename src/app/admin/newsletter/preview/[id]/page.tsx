import Link from "next/link";
import { notFound } from "next/navigation";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { renderNewsletterPreview } from "@/lib/newsletter/campaign-template";

export const dynamic = "force-dynamic";

type Campaign = { title: string; subject: string; preview_text: string; body_text: string; locale: string; status: string; hero_image_url: string | null };

export default async function PreviewNewsletterCampaign({
  params,
}: { params: Promise<{ id: string }> }) {
  await assertAdminAccess("/admin/newsletter");
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) notFound();
  const { data, error } = await createSupabaseAdminClient().from("newsletter_campaigns")
    .select("title,subject,preview_text,body_text,locale,status,hero_image_url").eq("id", id).maybeSingle<Campaign>();
  if (error || !data) notFound();
  const html = renderNewsletterPreview(data);

  return <main className="min-h-screen bg-neutral-950 px-5 py-10 text-white">
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/newsletter" className="text-sm text-white/65 hover:text-white">← Voltar às newsletters</Link>
      <h1 className="mt-6 text-3xl font-semibold">Pré-visualização: {data.title}</h1>
      <p className="mt-2 text-sm text-white/60">Assunto: {data.subject}</p>
      <p className="mt-2 text-sm text-amber-300">Simulação interna, sem envio. Os botões são meramente visuais.</p>
      <iframe title="Pré-visualização da newsletter" srcDoc={html} sandbox="" className="mt-6 h-[850px] w-full rounded-xl border border-white/10 bg-white" />
    </div>
  </main>;
}
