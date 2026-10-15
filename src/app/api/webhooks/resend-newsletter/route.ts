import { createHmac, timingSafeEqual } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_AGE_SECONDS = 300;

function verifySignature(raw: string, headers: Headers, secret: string): boolean {
  const id = headers.get("svix-id");
  const stamp = headers.get("svix-timestamp");
  const signature = headers.get("svix-signature");
  if (!id || !stamp || !signature || !secret.startsWith("whsec_")) return false;
  if (!/^\d+$/.test(stamp)) return false;
  const time = Number(stamp);
  if (!Number.isSafeInteger(time) || Math.abs(Math.floor(Date.now() / 1000) - time) > MAX_AGE_SECONDS) return false;
  const decoded = Buffer.from(secret.slice(6), "base64");
  if (decoded.length < 16) return false;
  const expected = createHmac("sha256", decoded).update(`${id}.${stamp}.${raw}`).digest();
  return signature.split(" ").some((token) => {
    if (!token.startsWith("v1,")) return false;
    const actual = Buffer.from(token.slice(3), "base64");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  });
}

type WebhookData = {
  type?: unknown;
  created_at?: unknown;
  data?: { email?: unknown; unsubscribed?: unknown };
};

export async function POST(req: Request): Promise<Response> {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) return new Response("Webhook não configurado", { status: 503 });
  const raw = await req.text();
  if (raw.length > 100_000 || !verifySignature(raw, req.headers, secret)) {
    return new Response("Assinatura inválida", { status: 401 });
  }
  let event: WebhookData;
  try {
    event = JSON.parse(raw) as WebhookData;
  } catch {
    return new Response("Dados inválidos", { status: 400 });
  }
  // Nunca reativa subscrições através de webhooks: uma reativação requer consentimento explícito.
  if (event.type === "contact.updated" && event.data?.unsubscribed === true) {
    const email = String(event.data.email ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return new Response("Email inválido", { status: 400 });
    }
    const happened = typeof event.created_at === "string" ? new Date(event.created_at) : null;
    if (!happened || Number.isNaN(happened.getTime())) return new Response("Evento sem data válida", { status: 400 });
    const now = new Date().toISOString();
    const { error } = await createSupabaseAdminClient()
      .from("newsletter_subscribers")
      .update({ status: "unsubscribed", unsubscribed_at: now, resend_synced_at: null, updated_at: now })
      .eq("email", email).eq("status", "active").lte("consented_at", happened.toISOString());
    if (error) return new Response("Falha de atualização", { status: 500 });
  }
  return Response.json({ received: true });
}
