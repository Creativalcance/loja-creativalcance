"use server";

import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseNewsletterCsv } from "@/lib/newsletter/parse-import-csv";
import { revalidatePath } from "next/cache";

const MAX_FILE_BYTES = 150_000;
const MAX_ROWS = 200;
type ImportResult = { ok: boolean; message: string; added?: number; existing?: number; invalid?: number; duplicates?: number };

export async function importNewsletterContacts(formData: FormData): Promise<ImportResult> {
  const admin = await assertAdminAccess("/admin/newsletter");
  const file = formData.get("file");
  const consentEvidence = String(formData.get("consent_evidence") ?? "").trim();
  const consentDate = String(formData.get("consent_date") ?? "").trim();
  const locale = String(formData.get("locale") ?? "pt");
  if (formData.get("confirm") !== "yes") return { ok: false, message: "É necessário confirmar a existência de consentimentos." };
  if (consentEvidence.length < 15 || consentEvidence.length > 500)
    return { ok: false, message: "Indica onde e como foi obtido o consentimento (15–500 caracteres)." };
  if (!["pt","en","fr","es","de","it"].includes(locale)) return { ok: false, message: "Idioma inválido." };
  const date = new Date(consentDate + "T12:00:00Z");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(consentDate) || Number.isNaN(date.valueOf()) ||
      date.toISOString().slice(0, 10) !== consentDate || consentDate > new Date().toISOString().slice(0,10))
    return { ok: false, message: "Indica uma data válida, no passado, para o consentimento." };
  if (!(file instanceof File) || file.size < 5 || file.size > MAX_FILE_BYTES)
    return { ok: false, message: "Seleciona um CSV válido com até 150 KB." };
  if (!/\.csv$/i.test(file.name)) return { ok: false, message: "O ficheiro tem de ser CSV." };

  let parsed: ReturnType<typeof parseNewsletterCsv>;
  try { parsed = parseNewsletterCsv(await file.text()); }
  catch (e) { return { ok: false, message: e instanceof Error ? e.message : "CSV inválido." }; }
  if (parsed.total < 1 || parsed.total > MAX_ROWS)
    return { ok: false, message: "Importa entre 1 e 200 linhas por lote." };
  const db = createSupabaseAdminClient();
  let added = 0, existing = 0;
  for (const row of parsed.valid) {
    // Nunca reativar contactos cancelados, alterar dados de consentimento anteriores,
    // ou enviar emails de boas-vindas para importações administrativas.
    const { data: found, error: checkError } = await db.from("newsletter_subscribers")
      .select("id").eq("email", row.email).maybeSingle();
    if (checkError) return { ok: false, message: "Erro a verificar duplicados. Tenta novamente." };
    if (found) { existing++; continue; }
    const { error } = await db.from("newsletter_subscribers").insert({
      name: row.name, email: row.email, locale, status: "active",
      source: "admin_csv", consented_at: date.toISOString(), unsubscribed_at: null,
      consent_evidence: consentEvidence, imported_by: admin.userId,
      imported_at: new Date().toISOString(), welcome_email_status: "skipped",
    });
    if (error?.code === "23505") { existing++; continue; }
    if (error) return { ok: false, message: `Importação interrompida após ${added} contactos: erro ao guardar os restantes. Repete o lote; os duplicados serão ignorados.` };
    added++;
  }
  const { error: auditError } = await db.from("newsletter_import_batches").insert({
    imported_by: admin.userId, source_filename: file.name.slice(0, 200),
    consent_evidence: consentEvidence, consented_at: date.toISOString(), locale,
    total_rows: parsed.total, imported_count: added,
    duplicate_count: parsed.duplicates + existing, invalid_count: parsed.invalid,
  });
  if (auditError) console.error("Newsletter admin import audit write failed", { code: auditError.code });
  revalidatePath("/admin/newsletter");
  return { ok: true, message: `Importação concluída: ${added} novos contactos, ${existing + parsed.duplicates} duplicados e ${parsed.invalid} inválidos. Não foram enviados emails.`,
    added, existing, duplicates: parsed.duplicates, invalid: parsed.invalid };
}
