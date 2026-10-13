"use server";

import { redirect } from "next/navigation";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type Sub = { id: string; email: string; name: string; locale: string; consented_at: string };
type RemoteContact = { unsubscribed?: boolean };

async function requestResend(path: string, key: string, init?: RequestInit): Promise<Response> {
  return fetch(`https://api.resend.com${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
}

/**
 * Operação manual e limitada. Não envia emails; insere contactos elegíveis num
 * segmento já validado. Nunca reativa contactos cancelados no Resend.
 */
export async function syncNewsletterContacts(formData: FormData): Promise<never> {
  await assertAdminAccess("/admin/newsletter");
  if (process.env.RESEND_NEWSLETTER_SYNC_ENABLED !== "true" || !process.env.RESEND_WEBHOOK_SECRET) {
    throw new Error("Sincronização suspensa até à ativação e validação do webhook.");
  }
  if (formData.get("confirm") !== "yes") throw new Error("Confirme a sincronização.");
  const key = process.env.RESEND_API_KEY?.trim();
  const segment = process.env.RESEND_NEWSLETTER_SEGMENT_ID?.trim();
  if (!key || !segment || !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(segment)) {
    throw new Error("Resend ainda não tem um segmento de marketing configurado.");
  }
  const db = createSupabaseAdminClient();
  const { data, error } = await db.from("newsletter_subscribers")
    .select("id,email,name,locale,consented_at")
    .eq("status", "active").eq("locale", "pt").is("unsubscribed_at", null)
    .not("consented_at", "is", null).order("created_at", { ascending: true }).limit(25)
    .returns<Sub[]>();
  if (error) throw new Error("Falha ao consultar consentimentos.");

  let synced = 0;
  let skipped = 0;
  let failed = 0;
  for (const subscriber of data ?? []) {
    const email = subscriber.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { skipped++; continue; }
    try {
      // Não sobrepor cancelamentos ou supressões existentes no prestador.
      const suppressed = await requestResend(`/suppressions/${encodeURIComponent(email)}`, key);
      if (suppressed.status !== 404) {
        if (suppressed.ok) skipped++;
        else failed++;
        continue;
      }
      const found = await requestResend(`/contacts/${encodeURIComponent(email)}`, key);
      if (found.status !== 404 && !found.ok) { failed++; continue; }
      if (found.ok) {
        const contact = await found.json() as RemoteContact;
        if (contact.unsubscribed !== false) { skipped++; continue; }
      } else {
        const created = await requestResend("/contacts", key, {
          method: "POST",
          body: JSON.stringify({
            email,
            first_name: subscriber.name.trim().split(/\s+/)[0] ?? "",
            unsubscribed: false,
          }),
        });
        if (!created.ok) { failed++; continue; }
      }
      // Reconfirmar no Supabase imediatamente antes de associar ao segmento.
      const { data: current } = await db.from("newsletter_subscribers")
        .select("id").eq("id", subscriber.id).eq("status", "active")
        .eq("consented_at", subscriber.consented_at).eq("locale", "pt").is("unsubscribed_at", null).maybeSingle();
      if (!current) { skipped++; continue; }
      const add = await requestResend(
        `/contacts/${encodeURIComponent(email)}/segments/${encodeURIComponent(segment)}`,
        key, { method: "POST" },
      );
      if (add.ok || add.status === 409) synced++;
      else failed++;
    } catch {
      failed++;
    }
  }
  redirect(`/admin/newsletter?sync=done&added=${synced}&skipped=${skipped}&failed=${failed}`);
}
