import Link from "next/link";
import { Download, Mail, Users, Send, FilePenLine } from "lucide-react";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { prepareNewsletterBroadcastDraft, saveNewsletterDraft, sendNewsletterTestEmail } from "./actions";
import { syncNewsletterContacts } from "./sync-actions";
import NewsletterHeroUpload from "./NewsletterHeroUpload";
import NewsletterContactImport from "./NewsletterContactImport";
import { refreshNewsletterBroadcastStatus } from "./send-actions";

export const dynamic = "force-dynamic";

type Campaign = { id: string; title: string; subject: string; preview_text: string; body_text: string; locale: string; audience: string; status: string; resend_broadcast_id: string | null; hero_image_url: string | null; created_at: string };

type Subscriber = { id: string; name: string; email: string; locale: string; status: string; source: string; consented_at: string; created_at: string };

export default async function NewsletterAdminPage({ searchParams }: { searchParams: Promise<{ edit?: string; sync?: string; added?: string; skipped?: string; failed?: string; heroError?: string; heroUploaded?: string; send?: string }> }) {
  await assertAdminAccess("/admin/newsletter");
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("newsletter_subscribers").select("id,name,email,locale,status,source,consented_at,created_at").order("created_at", { ascending: false }).returns<Subscriber[]>();
  if (error) throw new Error(`Não foi possível carregar a newsletter: ${error.message}`);
  const { edit, sync, added, skipped, failed, heroError, heroUploaded, send } = await searchParams;
  const resendConfigured = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_NEWSLETTER_SEGMENT_ID);
  const syncingAllowed = resendConfigured && Boolean(process.env.RESEND_WEBHOOK_SECRET) && process.env.RESEND_NEWSLETTER_SYNC_ENABLED === "true";
  const senderConfigured = Boolean(process.env.RESEND_MARKETING_FROM_EMAIL);
  const webhookConfigured = Boolean(process.env.RESEND_WEBHOOK_SECRET);
  const marketingDraftConfigured = resendConfigured && senderConfigured;
  const testEmails = (process.env.RESEND_NEWSLETTER_TEST_EMAILS ?? "").split(",").map(item => item.trim()).filter(Boolean);
  const allowedCount = (data ?? []).filter(item => item.status === "active" && item.consented_at).length;
  const { data: campaignRows, error: campaignError } = await supabase.from("newsletter_campaigns")
    .select("id,title,subject,preview_text,body_text,locale,audience,status,resend_broadcast_id,hero_image_url,created_at").order("created_at", { ascending: false }).limit(40).returns<Campaign[]>();
  const campaigns = [...(campaignRows ?? [])].sort((a, b) => Number(a.status === "cancelled") - Number(b.status === "cancelled"));
  const campaignsReady = !campaignError;
  const editing = campaigns.find(item => item.id === edit && item.status === "draft");
  const subscribers = data ?? [];
  const active = subscribers.filter((item) => item.status === "active").length;
  const { count: syncPending } = await supabase.from("newsletter_subscribers")
    .select("id", { count: "exact", head: true }).eq("status", "active")
    .eq("locale", "pt").is("unsubscribed_at", null).is("resend_synced_at", null);

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-12 text-white">
      <section className="mx-auto max-w-7xl">
        <Link href="/admin" className="text-sm font-semibold text-white/60 hover:text-white">← Voltar ao backoffice</Link>
        <div className="mt-7 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[.2em] text-white/50">Comunicação</p>
            <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Newsletter</h1>
            <p className="mt-3 max-w-3xl text-white/60">Lista de contactos que consentiram receber comunicações da 360 Merchandising.</p>
          </div>
          <Link href="/api/admin/newsletter/exportar" className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-neutral-950">
            <Download className="mr-2 h-4 w-4" />Exportar lista CSV
          </Link>
        </div>
        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[.03] p-5">
          <h2 className="text-lg font-semibold">Sincronização com Resend</h2>
          <p className="mt-2 text-sm text-white/60">Apenas contactos que autorizaram comunicações comerciais e não cancelaram a subscrição. Não envia emails.</p>
          <div className="mt-4 grid gap-2 text-sm text-white/70 sm:grid-cols-2">
            <p>API Resend: {process.env.RESEND_API_KEY ? "Configurada" : "Por configurar"}</p>
            <p>Segmento: {process.env.RESEND_NEWSLETTER_SEGMENT_ID ? "Configurado" : "Por configurar"}</p>
            <p>Remetente de marketing: {senderConfigured ? "Configurado" : "Por configurar"}</p>
            <p>Webhook assinado: {webhookConfigured ? "Configurado" : "Por configurar"}</p>
          </div>
          {!syncingAllowed ? <p className="mt-2 text-xs text-amber-300">Sincronização bloqueada: o webhook está desativado ou ainda não foi aprovado para operar.</p> : null}
          <p className="mt-2 text-xs text-white/50">Contactos ativos registados: {allowedCount}. Por sincronizar ou revalidar no Resend (PT): {syncPending ?? "—"}.</p>
          {sync === "done" ? <p className="mt-3 rounded-xl bg-white/5 p-3 text-sm text-white/75">Resultado: {added ?? "0"} associados, {skipped ?? "0"} excluídos, {failed ?? "0"} falhas. Máximo de 25 contactos pendentes por operação. Repete até não existirem pendentes.</p> : null}
          <form action={syncNewsletterContacts} className="mt-4 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-white/70"><input type="checkbox" name="confirm" value="yes" required disabled={!syncingAllowed} /> Confirmo a sincronização dos contactos elegíveis</label>
            <button type="submit" disabled={!syncingAllowed} className="rounded-xl bg-[#ff6a00] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Sincronizar contactos</button>
          </form>
        </section>
        <NewsletterContactImport />
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <article className="rounded-3xl border border-white/10 bg-white/[.03] p-5"><Users className="h-6 w-6" /><p className="mt-4 text-sm text-white/50">Subscritores ativos</p><p className="mt-1 text-3xl font-semibold">{active}</p></article>
          <article className="rounded-3xl border border-white/10 bg-white/[.03] p-5"><Mail className="h-6 w-6" /><p className="mt-4 text-sm text-white/50">Registos totais</p><p className="mt-1 text-3xl font-semibold">{subscribers.length}</p></article>
        </div>

        {send === "accepted" ? <div role="status" className="mt-8 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-200">Pedido de envio aceite pelo Resend. Consulta o histórico e o estado do Broadcast antes de considerares a campanha entregue.</div> : null}
        {heroError ? <div id="campaigns" role="alert" className="mt-8 rounded-xl border border-red-400/40 bg-red-400/10 p-4 text-sm text-red-200">{heroError}</div> : null}
        {heroUploaded ? <div id="campaigns" role="status" className="mt-8 rounded-xl border border-emerald-400/40 bg-emerald-400/10 p-4 text-sm text-emerald-200">Imagem carregada e associada à campanha.</div> : null}
        <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <section className="rounded-3xl border border-white/10 bg-white/[.03] p-6">
            <div className="flex items-center gap-3"><FilePenLine className="h-5 w-5 text-[#ff6a00]" /><h2 className="text-xl font-semibold">Criar campanha</h2></div>
            <p className="mt-2 text-sm leading-6 text-white/55">Para editar uma campanha existente, utiliza o botão Editar na respetiva ficha. Este formulário vazio cria uma campanha nova.</p>
            {!campaignsReady ? (
              <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">A migração de campanhas ainda não foi aplicada à base de dados. A criação de rascunhos ficará disponível após a migração.</p>
            ) : (
              <form key={editing?.id ?? "new"} action={saveNewsletterDraft} className="mt-6 grid gap-4">
                {editing ? <input type="hidden" name="campaign_id" value={editing.id} /> : null}
                <label className="grid gap-2 text-sm text-white/75">Nome interno da campanha
                  <input required name="title" minLength={3} maxLength={160} defaultValue={editing?.title ?? ""} placeholder="Nome da nova campanha" className="rounded-xl border border-white/15 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-[#ff6a00]" />
                </label>
                <label className="grid gap-2 text-sm text-white/75">Assunto
                  <input required name="subject" minLength={3} maxLength={200} defaultValue={editing?.subject ?? ""} placeholder="Assunto do email" className="rounded-xl border border-white/15 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-[#ff6a00]" />
                </label>
                <label className="grid gap-2 text-sm text-white/75">Pré-cabeçalho
                  <input name="preview" maxLength={250} defaultValue={editing?.preview_text ?? ""} placeholder="Texto de pré-visualização" className="rounded-xl border border-white/15 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-[#ff6a00]" />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm text-white/75">Idioma
                    <select name="locale" defaultValue={editing?.locale ?? "pt"} className="rounded-xl border border-white/15 bg-neutral-900 px-4 py-3 text-white"><option value="pt">Português</option><option value="en">Inglês</option><option value="fr">Francês</option><option value="es">Espanhol</option><option value="de">Alemão</option><option value="it">Italiano</option></select>
                  </label>
                  <label className="grid gap-2 text-sm text-white/75">Público previsto
                    <select name="audience" defaultValue={editing?.audience ?? "all"} className="rounded-xl border border-white/15 bg-neutral-900 px-4 py-3 text-white"><option value="all">Todos os subscritores elegíveis</option><option value="b2b">Empresas</option><option value="b2c">Particulares</option></select>
                  </label>
                </div>
                <label className="grid gap-2 text-sm text-white/75">Texto da campanha
                  <textarea name="body" rows={7} maxLength={30000} defaultValue={editing?.body_text ?? ""} placeholder="Escreve o conteúdo da nova campanha" className="rounded-xl border border-white/15 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-[#ff6a00]" />
                </label>
                <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff6a00] px-5 py-3 font-semibold text-white hover:bg-[#e65f00]"><FilePenLine className="h-4 w-4" />{editing ? "Guardar alterações" : "Guardar rascunho"}</button>
                <p className="text-xs text-white/45">Sem envio ou agendamento. Os segmentos não são utilizados enquanto não existir uma validação de elegibilidade.</p>
              </form>
            )}
          </section>
          <section className="rounded-3xl border border-white/10 bg-white/[.03] p-6">
            <div className="flex items-center gap-3"><Send className="h-5 w-5 text-[#ff6a00]" /><h2 className="text-xl font-semibold">Campanhas</h2></div>
            <p className="mt-2 text-sm text-white/55">Histórico de rascunhos e respetivos estados.</p>
            {!marketingDraftConfigured ? <p className="mt-3 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-200">É necessário configurar o segmento e o remetente comercial antes de preparar rascunhos externos.</p> : null}
            {campaignsReady ? (
              campaigns.length > 0 ? <div className="mt-5 grid gap-3">{campaigns.map((item) => (
                <article key={item.id} className="rounded-2xl border border-white/10 p-4">
                  <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">{item.title}</h3><span className="rounded-full bg-white/10 px-2.5 py-1 text-xs uppercase text-white/70">{item.status}</span></div>
                  <p className="mt-1 text-sm text-white/65">{item.subject}</p>
                  <p className="mt-2 text-xs uppercase text-white/40">{item.locale} · {item.audience} · {new Intl.DateTimeFormat("pt-PT", { dateStyle: "short" }).format(new Date(item.created_at))}</p>
                  {item.status === "draft" && item.hero_image_url ? <div className="mt-3 rounded-lg border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-xs text-emerald-200">Imagem principal associada. Esta campanha está pronta para pré-visualização.</div> : null}
                  {item.status === "draft" ? <NewsletterHeroUpload campaignId={item.id} hasImage={Boolean(item.hero_image_url)} /> : null}
                  <div className="mt-3 flex flex-wrap gap-3 text-sm">{item.status === "draft" ? <Link className="text-[#ff6a00] hover:underline" href={`/admin/newsletter?edit=${item.id}`}>Editar</Link> : null}<Link className="text-white/80 hover:underline" href={`/admin/newsletter/preview/${item.id}`} target="_blank" rel="noopener noreferrer">Pré-visualizar</Link></div>
                {item.status === "draft" && testEmails.length > 0 && senderConfigured ? (
                  <form action={sendNewsletterTestEmail} className="mt-4 rounded-xl border border-white/10 p-3">
                    <input type="hidden" name="campaign_id" value={item.id} />
                    <p className="text-sm font-semibold">Enviar email de teste</p>
                    <select aria-label="Endereço autorizado para teste" name="test_email" required className="mt-2 w-full rounded-xl border border-white/15 bg-neutral-900 px-3 py-2 text-xs text-white">
                      {testEmails.map(address => <option key={address} value={address}>{address}</option>)}
                    </select>
                    <label className="mt-3 flex gap-2 text-xs text-white/60">
                      <input type="checkbox" name="confirm" value="yes" required />
                      Confirmo o envio de um único email de teste para este endereço interno.
                    </label>
                    <button type="submit" className="mt-3 rounded-xl border border-white/25 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10">
                      Enviar teste interno
                    </button>
                  </form>
                ) : null}
                {item.status === "draft" ? (
                  <form action={prepareNewsletterBroadcastDraft} className="mt-4 border-t border-white/10 pt-3">
                    <input type="hidden" name="campaign_id" value={item.id} />
                    <label className="flex items-start gap-2 text-xs leading-5 text-white/60">
                      <input name="confirm" value="yes" required type="checkbox" className="mt-1" />
                      Preparar no Resend apenas como rascunho, sem envio. A lista de contactos precisa de validação antes da distribuição.
                    </label>
                    <button type="submit" disabled={!marketingDraftConfigured} className="mt-3 rounded-xl border border-[#ff6a00]/50 px-3 py-2 text-xs font-semibold text-[#ff6a00] hover:bg-[#ff6a00]/10 disabled:cursor-not-allowed disabled:opacity-40">Preparar rascunho Resend</button>
                  </form>
                ) : null}
                {item.status === "ready" && item.resend_broadcast_id ? (
                  <div className="mt-4 rounded-xl border border-[#ff6a00]/30 p-3">
                    <p className="text-xs text-white/60">Rascunho preparado no Resend. A distribuição exige confirmação administrativa separada.</p>
                    <Link href={`/admin/newsletter/enviar/${item.id}`} className="mt-3 inline-block rounded-xl bg-[#ff6a00] px-4 py-2 text-sm font-semibold text-white">Rever destinatários e autorizar envio</Link>
                  </div>
                ) : null}
                {item.status === "sending" ? <p className="mt-3 text-xs text-amber-300">Envio solicitado. Confirma o estado no Resend; não repitas a operação.</p> : null}
                {item.resend_broadcast_id && ["ready","sending","sent","scheduled"].includes(item.status) ? (
                  <form action={refreshNewsletterBroadcastStatus} className="mt-3">
                    <input type="hidden" name="campaign_id" value={item.id} />
                    <button type="submit" className="rounded-lg border border-white/20 px-3 py-2 text-xs text-white/70">Atualizar estado no Resend</button>
                  </form>
                ) : null}
                {item.resend_broadcast_id ? <p className="mt-3 text-xs text-white/50">ID Resend: {item.resend_broadcast_id} · <a className="underline" href={`https://resend.com/broadcasts/${item.resend_broadcast_id}`} target="_blank" rel="noopener noreferrer">Consultar no Resend</a></p> : null}
                </article>
              ))}</div> : <p className="mt-5 text-sm text-white/50">Ainda não existem campanhas.</p>
            ) : <p className="mt-5 text-sm text-white/50">A aguardar a migração da base de dados.</p>}
          </section>
        </div>
        <div className="mt-8 overflow-x-auto rounded-3xl border border-white/10">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-white/5 text-white/60"><tr><th className="p-4">Nome</th><th className="p-4">Email</th><th className="p-4">Idioma</th><th className="p-4">Estado</th><th className="p-4">Consentimento</th><th className="p-4">Origem</th></tr></thead>
            <tbody>{subscribers.map((item) => <tr key={item.id} className="border-t border-white/10"><td className="p-4 font-semibold">{item.name}</td><td className="p-4 text-white/70">{item.email}</td><td className="p-4 uppercase">{item.locale}</td><td className="p-4"><span className={item.status === "active" ? "rounded-full bg-emerald-400/15 px-3 py-1 text-emerald-300" : "rounded-full bg-white/10 px-3 py-1 text-white/60"}>{item.status === "active" ? "Ativo" : "Cancelado"}</span></td><td className="p-4 text-white/60">{new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.consented_at))}</td><td className="p-4 text-white/60">{item.source}</td></tr>)}</tbody>
          </table>
          {subscribers.length === 0 ? <p className="border-t border-white/10 p-8 text-center text-white/50">Ainda não existem subscrições.</p> : null}
        </div>
      </section>
    </main>
  );
}
