import Link from "next/link";
import { notFound } from "next/navigation";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { confirmNewsletterBroadcastSend } from "../../send-actions";

export const dynamic = "force-dynamic";

export default async function NewsletterSendConfirmation({ params }: { params: Promise<{ id: string }> }) {
  await assertAdminAccess("/admin/newsletter");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = createSupabaseAdminClient();
  const { data: campaign } = await db.from("newsletter_campaigns")
    .select("id,title,subject,locale,audience,status,resend_broadcast_id").eq("id", id).maybeSingle();
  if (!campaign || campaign.status !== "ready" || !campaign.resend_broadcast_id) notFound();
  const { count: eligible } = await db.from("newsletter_subscribers")
    .select("id", { count: "exact", head: true }).eq("status", "active").eq("locale", "pt")
    .is("unsubscribed_at", null).not("resend_synced_at", "is", null);
  const { count: pending } = await db.from("newsletter_subscribers")
    .select("id", { count: "exact", head: true }).eq("status", "active").eq("locale", "pt")
    .is("unsubscribed_at", null).is("resend_synced_at", null);
  const enabled = Boolean(eligible && pending === 0 && campaign.locale === "pt" && campaign.audience === "all");

  return <main className="min-h-screen bg-neutral-950 px-5 py-12 text-white">
    <div className="mx-auto max-w-2xl">
      <Link href="/admin/newsletter" className="text-sm text-white/60 hover:text-white">← Voltar sem enviar</Link>
      <h1 className="mt-8 text-3xl font-semibold">Confirmar envio comercial</h1>
      <p className="mt-3 text-sm leading-6 text-white/65">Esta ação envia uma newsletter real para todos os contactos elegíveis do segmento português. Não é um teste nem um agendamento.</p>
      <div className="mt-8 space-y-3 rounded-2xl border border-white/15 bg-white/[.03] p-6">
        <p><span className="text-white/50">Campanha:</span> {campaign.title}</p>
        <p><span className="text-white/50">Assunto:</span> {campaign.subject}</p>
        <p><span className="text-white/50">Público:</span> Subscritores elegíveis · Português (PT)</p>
        <p><span className="text-white/50">Contactos locais sincronizados:</span> <strong>{eligible ?? "—"}</strong></p>
        <p><span className="text-white/50">Contactos locais pendentes:</span> <strong>{pending ?? "—"}</strong></p>
        <p className="text-xs text-white/50">O número é uma estimativa local; o Resend pode ainda excluir endereços suprimidos ou cancelados.</p>
        <Link className="inline-block text-sm text-[#ff6a00] underline" href={`/admin/newsletter/preview/${campaign.id}`} target="_blank">Rever o conteúdo</Link>
        <a className="ml-4 inline-block text-sm text-[#ff6a00] underline" href={`https://resend.com/broadcasts/${campaign.resend_broadcast_id}`} target="_blank" rel="noopener noreferrer">Ver no Resend</a>
      </div>
      {!enabled ? <p className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">Envio bloqueado: sincroniza primeiro todos os contactos elegíveis ou verifica a configuração do público.</p> : null}
      <form action={confirmNewsletterBroadcastSend} className="mt-8 space-y-5 rounded-2xl border border-orange-500/30 p-6">
        <input type="hidden" name="campaign_id" value={campaign.id} />
        <input type="hidden" name="expected_recipients" value={eligible ?? 0} />
        <label className="block text-sm text-white/75">
          Escreve <strong>ENVIAR</strong> para autorizar esta distribuição comercial.
          <input name="confirmation_text" required autoComplete="off" placeholder="ENVIAR"
            className="mt-3 w-full rounded-xl border border-white/20 bg-neutral-900 p-3 text-white" />
        </label>
        <label className="flex items-start gap-3 text-sm text-white/75">
          <input name="confirm" value="yes" type="checkbox" required className="mt-1" />
          Confirmo que revi a campanha e autorizo o envio comercial para os subscritores elegíveis, respeitando os cancelamentos.
        </label>
        <button type="submit" disabled={!enabled} className="rounded-xl bg-[#ff6a00] px-6 py-3 font-semibold text-white disabled:opacity-40">Confirmar e enviar newsletter</button>
        <p className="text-xs text-white/40">Um pedido é aceite apenas uma vez. Em caso de falha incerta, o envio fica bloqueado até reconciliação.</p>
      </form>
    </div>
  </main>;
}
