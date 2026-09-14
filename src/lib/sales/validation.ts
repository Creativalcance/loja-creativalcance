import { z } from "zod";
const optionalNumber = (min: number, max: number) =>
  z.preprocess(
    (v) => (v === "" || v == null ? null : Number(v)),
    z.number().int().min(min).max(max).nullable(),
  );
const short = z.string().trim().max(200).default("");
export const agentSchema = z
  .object({
    full_name: z.string().trim().min(2).max(160),
    email: z.email().trim().toLowerCase().max(254),
    phone: short,
    company_name: short,
    tax_id: short,
    billing_address: z.string().trim().max(1000).default(""),
    iban: z.string().trim().max(50).default(""),
    countries: z
      .array(z.string().regex(/^[A-Z]{2}$/))
      .min(1)
      .max(50)
      .transform((v) => [...new Set(v)]),
    locale: z.enum(["pt", "en", "fr", "es", "de", "it"]),
    status: z.enum(["draft", "invited", "active", "suspended"]),
    supplier_rate_bps: optionalNumber(0, 10000),
    manual_rate_bps: optionalNumber(0, 10000),
    hold_days: optionalNumber(0, 365),
    attribution_months: optionalNumber(0, 120),
    recurring: z.boolean().nullable(),
    commission_enabled: z.boolean(),
    monthly_target_cents: z.number().int().min(0).max(1000000000),
    starts_on: z.iso.date(),
    ends_on: z.iso.date().nullable(),
  })
  .superRefine((a, ctx) => {
    if (a.ends_on && a.ends_on < a.starts_on)
      ctx.addIssue({
        code: "custom",
        message: "A data final tem de ser posterior à data inicial.",
      });
    if (
      a.commission_enabled &&
      [
        a.supplier_rate_bps,
        a.manual_rate_bps,
        a.hold_days,
        a.attribution_months,
        a.recurring,
      ].some((v) => v === null)
    )
      ctx.addIssue({
        code: "custom",
        message:
          "Define as duas percentagens, o prazo, a duração da carteira e a recorrência antes de ativar comissões.",
      });
  });
export const contactSchema = z.object({
  name: z.string().trim().min(2).max(160),
  email: z.email().trim().toLowerCase().max(254),
  phone: short,
  company_name: short,
  country_code: z.string().regex(/^[A-Z]{2}$/),
  stage: z.enum(["new", "contacted", "qualified", "proposal", "won", "lost"]),
  notes: z.string().trim().max(5000),
  next_contact_on: z.iso.date().nullable(),
});
export const uuid = z.uuid();
export function moneyCents(value: unknown): number {
  const s = String(value ?? "")
    .trim()
    .replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(s))
    throw new Error("Indica um valor válido, com até duas casas decimais.");
  const [whole, decimal = ""] = s.split(".");
  const result = Number(whole) * 100 + Number(decimal.padEnd(2, "0"));
  if (!Number.isSafeInteger(result) || result > 1000000000)
    throw new Error("Valor fora do limite permitido.");
  return result;
}
export function csvCell(value: unknown): string {
  let s = String(value ?? "");
  if (/^[\s]*[=+@-]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
