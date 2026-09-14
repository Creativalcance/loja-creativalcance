"use server";

import { normalizeCountryCode, normalizePortuguesePostalCode } from "@/lib/markets/countries";
import { marketText } from "@/lib/markets/i18n";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSiteLocale, localizePath, type SiteLocale } from "@/lib/i18n/config";

export type CustomerDataState = { success: boolean; message: string };
const value = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
const optional = (data: FormData, key: string) => value(data, key) || null;

async function authenticatedClient() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

function refreshAccount(locale: SiteLocale) {
  revalidatePath(localizePath("/area-cliente", locale));
  revalidatePath(localizePath("/area-cliente/dados", locale));
  revalidatePath(localizePath("/checkout", locale));
}

export async function updateCustomerDataAction(_state: CustomerDataState, formData: FormData): Promise<CustomerDataState> {
  const locale = getSiteLocale(value(formData, "locale")); const t = actionCopy[locale];
  const { supabase, user } = await authenticatedClient();
  if (!user) return { success: false, message: t.expired };
  const fullName = value(formData, "full_name");
  if (!fullName) return { success: false, message: t.fullName };
  const taxId = value(formData, "tax_id").replace(/\s+/g, "") || null;
  const billingEmail = optional(formData, "billing_email");
  if (billingEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billingEmail)) return { success: false, message: t.invalidEmail };
  const { error } = await supabase.from("profiles").update({
    full_name: fullName, phone: optional(formData, "phone"), company_name: optional(formData, "company_name"), tax_id: taxId, billing_email: billingEmail,
  }).eq("id", user.id);
  if (error) return { success: false, message: t.saveFailed };
  refreshAccount(locale);
  return { success: true, message: t.saved };
}

export async function addCustomerAddressAction(_state: CustomerDataState, formData: FormData): Promise<CustomerDataState> {
  const locale = getSiteLocale(value(formData, "locale")); const t = actionCopy[locale];
  const { supabase, user } = await authenticatedClient();
  if (!user) return { success: false, message: t.expired };
  const addressType = value(formData, "address_type") === "billing" ? "billing" : "shipping";
  if (["contact_name", "address_line_1", "postal_code", "city"].some((key) => !value(formData, key))) return { success: false, message: t.requiredAddress };
  const countryCode = normalizeCountryCode(formData.get("country_code"));
  if (!countryCode) return { success: false, message: marketText("invalidCountry", locale) };
  if (countryCode === "PT" && !normalizePortuguesePostalCode(value(formData, "postal_code"))) {
    return { success: false, message: marketText("invalidPostal", locale) };
  }
  const { count } = await supabase.from("customer_addresses").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("address_type", addressType);
  const makeDefault = formData.get("is_default") === "on" || (count ?? 0) === 0;
  if (makeDefault) {
    const { error } = await supabase.from("customer_addresses").update({ is_default: false }).eq("user_id", user.id).eq("address_type", addressType);
    if (error) return { success: false, message: t.preferredFailed };
  }
  const { error } = await supabase.from("customer_addresses").insert({
    user_id: user.id, address_type: addressType, label: optional(formData, "label"), company_name: optional(formData, "company_name"),
    tax_id: optional(formData, "tax_id")?.replace(/\s+/g, "") ?? null, contact_name: value(formData, "contact_name"),
    contact_email: optional(formData, "contact_email"), contact_phone: optional(formData, "contact_phone"), address_line_1: value(formData, "address_line_1"),
    address_line_2: optional(formData, "address_line_2"), postal_code: value(formData, "postal_code").toUpperCase(), city: value(formData, "city"),
    district: optional(formData, "district"), country_code: countryCode, is_default: makeDefault,
  });
  if (error) return { success: false, message: t.addressFailed };
  refreshAccount(locale);
  return { success: true, message: addressType === "billing" ? t.billingSaved : t.shippingSaved };
}

export async function setPreferredAddressAction(formData: FormData) {
  const locale = getSiteLocale(value(formData, "locale"));
  const { supabase, user } = await authenticatedClient();
  if (!user) return;
  const id = value(formData, "id");
  const type = value(formData, "address_type") === "billing" ? "billing" : "shipping";
  await supabase.from("customer_addresses").update({ is_default: false }).eq("user_id", user.id).eq("address_type", type);
  await supabase.from("customer_addresses").update({ is_default: true }).eq("id", id).eq("user_id", user.id).eq("address_type", type);
  refreshAccount(locale);
}

export async function deleteCustomerAddressAction(formData: FormData) {
  const locale = getSiteLocale(value(formData, "locale"));
  const { supabase, user } = await authenticatedClient();
  if (!user) return;
  const id = value(formData, "id");
  const type = value(formData, "address_type") === "billing" ? "billing" : "shipping";
  const { data: deleted } = await supabase.from("customer_addresses").delete().eq("id", id).eq("user_id", user.id).select("is_default").maybeSingle<{ is_default: boolean }>();
  if (deleted?.is_default) {
    const { data: next } = await supabase.from("customer_addresses").select("id").eq("user_id", user.id).eq("address_type", type).order("created_at", { ascending: false }).limit(1).maybeSingle<{ id: string }>();
    if (next) await supabase.from("customer_addresses").update({ is_default: true }).eq("id", next.id);
  }
  refreshAccount(locale);
}

const actionCopy = {
  pt: { expired: "A sessão expirou. Inicia sessão novamente.", fullName: "Indica o nome completo.", invalidEmail: "Indica um e-mail de faturação válido.", saveFailed: "Não foi possível guardar os dados da conta.", saved: "Dados da conta atualizados com sucesso.", requiredAddress: "Preenche os campos obrigatórios da morada.", preferredFailed: "Não foi possível atualizar a morada preferida.", addressFailed: "Não foi possível guardar a morada.", billingSaved: "Morada de faturação guardada.", shippingSaved: "Morada de entrega guardada." },
  en: { expired: "Your session has expired. Sign in again.", fullName: "Enter your full name.", invalidEmail: "Enter a valid billing email.", saveFailed: "The account details could not be saved.", saved: "Account details updated successfully.", requiredAddress: "Complete the required address fields.", preferredFailed: "The preferred address could not be updated.", addressFailed: "The address could not be saved.", billingSaved: "Billing address saved.", shippingSaved: "Delivery address saved." },
  fr: { expired: "Votre session a expiré. Reconnectez-vous.", fullName: "Saisissez votre nom complet.", invalidEmail: "Saisissez un e-mail de facturation valide.", saveFailed: "Impossible d’enregistrer les données du compte.", saved: "Données du compte mises à jour.", requiredAddress: "Remplissez les champs obligatoires de l’adresse.", preferredFailed: "Impossible de modifier l’adresse préférée.", addressFailed: "Impossible d’enregistrer l’adresse.", billingSaved: "Adresse de facturation enregistrée.", shippingSaved: "Adresse de livraison enregistrée." },

es: { expired: "Tu sesi\u00F3n ha caducado. Inicia sesi\u00F3n de nuevo.", fullName: "Indica tu nombre completo.", invalidEmail: "Indica un correo de facturaci\u00F3n v\u00E1lido.", saveFailed: "No se han podido guardar los datos de la cuenta.", saved: "Datos de la cuenta actualizados correctamente.", requiredAddress: "Completa los campos obligatorios de la direcci\u00F3n.", preferredFailed: "No se ha podido actualizar la direcci\u00F3n preferida.", addressFailed: "No se ha podido guardar la direcci\u00F3n.", billingSaved: "Direcci\u00F3n de facturaci\u00F3n guardada.", shippingSaved: "Direcci\u00F3n de entrega guardada." },
de: { expired: "Ihre Sitzung ist abgelaufen. Melden Sie sich erneut an.", fullName: "Geben Sie Ihren vollst\u00E4ndigen Namen ein.", invalidEmail: "Geben Sie eine g\u00FCltige E-Mail-Adresse f\u00FCr Rechnungen ein.", saveFailed: "Die Kontodaten konnten nicht gespeichert werden.", saved: "Kontodaten erfolgreich aktualisiert.", requiredAddress: "F\u00FCllen Sie die Pflichtfelder der Adresse aus.", preferredFailed: "Die bevorzugte Adresse konnte nicht aktualisiert werden.", addressFailed: "Die Adresse konnte nicht gespeichert werden.", billingSaved: "Rechnungsadresse gespeichert.", shippingSaved: "Lieferadresse gespeichert." },
it: { expired: "La sessione \u00E8 scaduta. Accedi di nuovo.", fullName: "Inserisci il tuo nome completo.", invalidEmail: "Inserisci un'e-mail di fatturazione valida.", saveFailed: "Impossibile salvare i dati dell'account.", saved: "Dati dell'account aggiornati correttamente.", requiredAddress: "Completa i campi obbligatori dell'indirizzo.", preferredFailed: "Impossibile aggiornare l'indirizzo preferito.", addressFailed: "Impossibile salvare l'indirizzo.", billingSaved: "Indirizzo di fatturazione salvato.", shippingSaved: "Indirizzo di consegna salvato." },
} satisfies Record<SiteLocale, Record<string, string>>;
