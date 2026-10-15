import Link from "next/link";
import { notFound } from "next/navigation";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const TYPES = [
  ["sent","Processados"], ["delivered","Entregues"], ["opened","Aberturas únicas"],
  ["clicked","Cliques únicos"], ["bounced","Rejeitados"], ["suppressed","Suprimidos"],
  ["unsubscribed","Cancelamentos"], ["complained","Queixas de spam"],
] as const;

type RecipientList = { data?: Array<{ id: string }>; has_more?: boolean };
type Metric = { type: string; label: string; count: number | null; partial: boolean; error: boolean; reason?: string };
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

async function fetchRecipients(url: URL, apiKey: string): Promise<Response> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    if (response.status !== 429 && response.status < 500) return response;
    if (attempt === 3) return response;
    const retryAfter = Number(response.headers.get("retry-after"));
    const wait = Number.isFinite(retryAfter) && retryAfter > 0
      ? Math.min(5000, retryAfter * 1000)
      : 950 * (attempt + 1);
    await sleep(wait);
  }
  throw new Error("Limite de pedidos ao Resend.");
}

async function getMetric(id: string, type: string, apiKey: string): Promise<Metric> {
  const label = TYPES.find(([key]) => key === type)?.[1] ?? type;
  let count = 0;
  let cursor = "";
  let partial = false;
  try {
    // Limite explícito de 5000 linhas: não confundir medições parciais com totais.
    for (let page = 0; page < 50; page++) {
      const url = new URL(`https://api.resend.com/broadcasts/${id}/recipients`);
      url.searchParams.set("type", type); url.searchParams.set("limit", "100");
      if (cursor) url.searchParams.set("after", cursor);
      const response = await fetchRecipients(url, apiKey);
      if (!response.ok) throw new Error("Resend status " + response.status);
      const data = await response.json() as RecipientList;
      const rows = data.data ?? [];
      count += rows.length;
      if (!data.has_more) return { type, label, count, partial: false, error: false };
      if (!rows.length || !rows[rows.length - 1]?.id) throw new Error("Paginação inválida.");
      cursor = rows[rows.length - 1].id;
    }
    partial = true;
    return { type, label, count, partial, error: false };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Falha de ligação ao Resend.";
    console.warn("Newsletter stats unavailable", { eventType: type, reason });
    return { type, label, count: null, partial, error: true, reason };
  }
}

export default async function NewsletterCampaignStats({ params }: { params: Promise<{ id: string }> }) {
  await assertAdminAccess("/admin/newsletter");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = createSupabaseAdminClient();
  const { data: campaign } = await db.from("newsletter_campaigns")
    .select("id,title,subject,status,resend_broadcast_id").eq("id", id).maybeSingle();
  if (!campaign?.resend_broadcast_id) notFound();
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const metrics: Metric[] = [];
  if (apiKey) {
    // Consultas sequenciais para não ultrapassar os limites de pedidos da API.
    for (const [index, [type]] of TYPES.entries()) {
      if (index > 0) await sleep(650);
      metrics.push(await getMetric(campaign.resend_broadcast_id, type, apiKey));
    }
  } else {
    metrics.push(...TYPES.map(([type,label]) => ({
      type, label, count: null, partial: false, error: true,
      reason: "Chave Resend não configurada.",
    })));
  }
  const delivered = metrics.find(m => m.type === "delivered")?.count;
  const sent = metrics.find(m => m.type === "sent")?.count;
  const deliveryRate = sent && delivered !== null && delivered !== undefined ? Math.round(1000 * delivered / sent) / 10 : null;

  return <main className="min-h-screen bg-neutral-950 px-5 py-12 text-white">
    <div className="mx-auto max-w-5xl">
      <Link href="/admin/newsletter" className="text-sm text-white/60 hover:text-white">← Voltar às newsletters</Link>
      <h1 className="mt-7 text-3xl font-semibold">Estatísticas da campanha</h1>
      <p className="mt-3 text-white/65">{campaign.title}</p>
      <p className="mt-1 text-sm text-white/50">{campaign.subject} · Estado local: {campaign.status}</p>
      <p className="mt-3 text-xs text-white/40">Dados consultados diretamente no Resend ao abrir esta página. Os resultados de abertura e clique dependem do rastreamento do email.</p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map(metric => <article key={metric.type} className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
          <p className="text-sm text-white/55">{metric.label}</p>
          <p className="mt-3 text-3xl font-semibold">{metric.count === null ? "—" : `${metric.partial ? "≥ " : ""}${metric.count}`}</p>
          {metric.error ? <p className="mt-2 text-xs text-amber-300">{metric.reason?.startsWith("Resend status") ? "A consulta ao Resend foi recusada (" + metric.reason + ")." : "Dados indisponíveis. Verifica a configuração e volta a tentar."}</p> : null}
          {metric.partial ? <p className="mt-2 text-xs text-amber-300">Contagem parcial (mais de 5000 registos)</p> : null}
        </article>)}
      </div>
      <p className="mt-5 text-sm text-white/65">Taxa de entrega: <strong>{deliveryRate === null ? "—" : `${deliveryRate}%`}</strong> dos destinatários processados.</p>
      <div className="mt-7 flex flex-wrap gap-3">
        <Link href={`https://resend.com/broadcasts/${campaign.resend_broadcast_id}`}
          target="_blank" rel="noopener noreferrer" className="rounded-xl border border-white/20 px-4 py-3 text-sm text-white">Consultar campanha no Resend</Link>
        <Link href={`/admin/newsletter/preview/${campaign.id}`}
          className="rounded-xl border border-white/20 px-4 py-3 text-sm text-white">Rever conteúdo original</Link>
      </div>
    </div>
  </main>;
}
