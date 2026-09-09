import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csv(value: unknown): string {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export async function GET() {
  await assertAdminAccess("/admin/newsletter");
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("newsletter_subscribers").select("name,email,locale,status,source,consented_at,unsubscribed_at,created_at").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const rows = [
    ["Nome", "Email", "Idioma", "Estado", "Origem", "Consentimento", "Cancelamento", "Criado em"],
    ...(data ?? []).map((item) => [item.name, item.email, item.locale, item.status, item.source, item.consented_at, item.unsubscribed_at, item.created_at]),
  ];
  const body = `\uFEFF${rows.map((row) => row.map(csv).join(";")).join("\r\n")}`;
  return new Response(body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="newsletter-360-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" } });
}
