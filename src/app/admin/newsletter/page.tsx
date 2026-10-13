import Link from "next/link";
import { Download, Mail, Users, Send, FilePenLine } from "lucide-react";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { prepareNewsletterBroadcastDraft, saveNewsletterDraft } from "./actions";
import { syncNewsletterContacts } from "./sync-actions";

export const dynamic = "force-dynamic";

type Campaign = { id: string; title: string; subject: string; preview_text: string; body_text: string; locale: string; audience: string; status: string; resend_broadcast_id: string | null; created_at: string };

type Subscriber = { id: string; name: string; email: string; locale: string; status: string; source: string; consented_at: string; created_at: string };

export default async function NewsletterAdminPage({ searchParams }: { searchParams: Promise<{ edit?: string; sync?: string; added?: string; skipped?: string; failed?: string }> }) {
  await assertAdminAccess("/admin/newsletter");
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("newsletter_subscribers").select("id,name,email,locale,status,source,consented_at,created_at").order("created_at", { ascending: false }).returns<Subscriber[]>();
  if (error) throw new Error(`Não foi possível carregar a newsletter: ${error.message}`);
  const { edit, sync, added, skipped, failed } = await searchParams;
  const resendConfigured = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_NEWSLETTER_SEGMENT_ID);
  const { data: campaignRows, error: campaignError } = await supabase.from("newsletter_campaigns")
    .select("id,title,subject,preview_text,body_text,locale,audience,status,resend_broadcast_id,created_at").order("created_at", { ascending: false }).limit(40).returns<Campaign[]>();
  const campaigns = campaignRows ?? [];
  const campaignsReady = !campaignError;
  const editing = campaigns.find(item => item.id === edit && item.status === "draft");
  const subscribers = data ?? [];
  const active = subscribers.filter((item) => item.status === "active").length;

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
          <p className="mt-2 text-sm text-white/60">Estado: {resendConfigured ? "Segmento configurado" : "A aguardar configuração do segmento Resend"}</p>
          {sync === "done" ? <p className="mt-3 rounded-xl bg-white/5 p-3 text-sm text-white/75">Resultado: {added ?? "0"} associados, {skipped ?? "0"} excluídos, {failed ?? "0"} falhas. Máximo de 25 contactos por operação.</p> : null}
          <form action={syncNewsletterContacts} className="mt-4 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-white/70"><input type="checkbox" name="confirm" value="yes" required disabled={!resendConfigured} /> Confirmo a sincronização dos contactos elegíveis</label>
            <button type="submit" disabled={!resendConfigured} className="rounded-xl bg-[#ff6a00] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Sincronizar contactos</button>
          </form>
        </section>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <article className="rounded-3xl border border-white/10 bg-white/[.03] p-5"><Users className="h-6 w-6" /><p className="mt-4 text-sm text-white/50">Subscritores ativos</p><p className="mt-1 text-3xl font-semibold">{active}</p></article>
          <article className="rounded-3xl border border-white/10 bg-white/[.03] p-5"><Mail className="h-6 w-6" /><p className="mt-4 text-sm text-white/50">Registos totais</p><p className="mt-1 text-3xl font-semibold">{subscribers.length}</p></article>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <section className="rounded-3xl border border-white/10 bg-white/[.03] p-6">
            <div className="flex items-center gap-3"><FilePenLine className="h-5 w-5 text-[#ff6a00]" /><h2 className="text-xl font-semibold">Criar campanha</h2></div>
            <p className="mt-2 text-sm leading-6 text-white/55">Cria ou edita um rascunho. Podes pré-visualizar antes da aprovação; o envio permanece bloqueado.</p>
            {!campaignsReady ? (
              <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">A migração de campanhas ainda não foi aplicada à base de dados. A criação de rascunhos ficará disponível após a migração.</p>
            ) : (
              <form key={editing?.id ?? "new"} action={saveNewsletterDraft} className="mt-6 grid gap-4">
                {editing ? <input type="hidden" name="campaign_id" value={editing.id} /> : null}
                <label className="grid gap-2 text-sm text-white/75">Nome interno da campanha
                  <input required name="title" minLength={3} maxLength={160} defaultValue={editing?.title ?? "Lançamento 360 Merchandising"} className="rounded-xl border border-white/15 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-[#ff6a00]" />
                </label>
                <label className="grid gap-2 text-sm text-white/75">Assunto
                  <input required name="subject" minLength={3} maxLength={200} defaultValue={editing?.subject ?? "A tua marca merece mais do que um logótipo esquecido."} className="rounded-xl border border-white/15 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-[#ff6a00]" />
                </label>
                <label className="grid gap-2 text-sm text-white/75">Pré-cabeçalho
                  <input name="preview" maxLength={250} defaultValue={editing?.preview_text ?? "A 360 Merchandising chegou. Escolhe, personaliza e encomenda."} className="rounded-xl border border-white/15 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-[#ff6a00]" />
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
                  <textarea name="body" rows={7} maxLength={30000} defaultValue={editing?.body_text ?? "A tua marca não nasceu para ficar parada.\n\nA 360 Merchandising chegou. Escolhe os teus produtos, personaliza e encomenda online.\n\nPortes gratuitos em encomendas a partir de 50 €.\n\nhttps://360-merchandising.com"} className="rounded-xl border border-white/15 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-[#ff6a00]" />
                </label>
                <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff6a00] px-5 py-3 font-semibold text-white hover:bg-[#e65f00]"><FilePenLine className="h-4 w-4" />{editing ? "Guardar alterações" : "Guardar rascunho"}</button>
                <p className="text-xs text-white/45">Sem envio ou agendamento. Os segmentos não são utilizados enquanto não existir uma validação de elegibilidade.</p>
              </form>
            )}
          </section>
          <section className="rounded-3xl border border-white/10 bg-white/[.03] p-6">
            <div className="flex items-center gap-3"><Send className="h-5 w-5 text-[#ff6a00]" /><h2 className="text-xl font-semibold">Campanhas</h2></div>
            <p className="mt-2 text-sm text-white/55">Histórico de rascunhos e respetivos estados.</p>
            {campaignsReady ? (
              campaigns.length > 0 ? <div className="mt-5 grid gap-3">{campaigns.map((item) => (
                <article key={item.id} className="rounded-2xl border border-white/10 p-4">
                  <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">{item.title}</h3><span className="rounded-full bg-white/10 px-2.5 py-1 text-xs uppercase text-white/70">{item.status}</span></div>
                  <p className="mt-1 text-sm text-white/65">{item.subject}</p>
                  <p className="mt-2 text-xs uppercase text-white/40">{item.locale} · {item.audience} · {new Intl.DateTimeFormat("pt-PT", { dateStyle: "short" }).format(new Date(item.created_at))}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm">{item.status === "draft" ? <Link className="text-[#ff6a00] hover:underline" href={`/admin/newsletter?edit=${item.id}`}>Editar</Link> : null}<Link className="text-white/80 hover:underline" href={`/admin/newsletter/preview/${item.id}`} target="_blank" rel="noopener noreferrer">Pré-visualizar</Link></div>
                {item.status === "draft" ? (
                  <form action={prepareNewsletterBroadcastDraft} className="mt-4 border-t border-white/10 pt-3">
                    <input type="hidden" name="campaign_id" value={item.id} />
                    <label className="flex items-start gap-2 text-xs leading-5 text-white/60">
                      <input name="confirm" value="yes" required type="checkbox" className="mt-1" />
                      Preparar no Resend apenas como rascunho, sem envio. A lista de contactos precisa de validação antes da distribuição.
                    </label>
                    <button type="submit" className="mt-3 rounded-xl border border-[#ff6a00]/50 px-3 py-2 text-xs font-semibold text-[#ff6a00] hover:bg-[#ff6a00]/10">Preparar rascunho Resend</button>
                  </form>
                ) : null}
                {item.resend_broadcast_id ? <p className="mt-3 text-xs text-white/50">ID Resend: {item.resend_broadcast_id}</p> : null}
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
