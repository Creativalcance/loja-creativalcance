import SiteHeader from "@/components/layout/SiteHeader";
import CustomerDashboardLink from "@/components/customer/CustomerDashboardLink";
import { assertCustomerAccess } from "@/lib/auth/assert-customer";
import CustomerDataForm, { type CustomerAddress } from "./CustomerDataForm";
import { localizePath } from "@/lib/i18n/config";
import { getCurrentLocale } from "@/lib/i18n/server";
import { customerCopy } from "@/lib/i18n/account";

export const dynamic = "force-dynamic";
type Profile = { full_name: string | null; email: string; phone: string | null; company_name: string | null; tax_id: string | null; billing_email: string | null };

export default async function CustomerDataPage() {
  const locale = await getCurrentLocale(); const t = customerCopy[locale];
  const { user, supabase } = await assertCustomerAccess(localizePath("/area-cliente/dados", locale));
  const [{ data: profile }, { data: addresses }] = await Promise.all([
    supabase.from("profiles").select("full_name,email,phone,company_name,tax_id,billing_email").eq("id", user.id).single<Profile>(),
    supabase.from("customer_addresses").select("id,address_type,label,company_name,tax_id,contact_name,contact_email,contact_phone,address_line_1,address_line_2,postal_code,city,district,country_code,is_default").eq("user_id", user.id).order("is_default", { ascending: false }).order("created_at", { ascending: false }).returns<CustomerAddress[]>(),
  ]);
  return <><SiteHeader context="customer"/><main className="min-h-screen bg-neutral-50 px-6 py-10"><section className="mx-auto max-w-5xl"><CustomerDashboardLink locale={locale}/><div className="mt-6 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm md:p-8"><h1 className="text-3xl font-semibold">{t.dataTitle}</h1><p className="mt-3 max-w-3xl text-neutral-600">{t.dataIntro}</p><CustomerDataForm locale={locale} fullName={profile?.full_name ?? ""} email={profile?.email ?? user.email ?? ""} phone={profile?.phone ?? ""} companyName={profile?.company_name ?? ""} taxId={profile?.tax_id ?? ""} billingEmail={profile?.billing_email ?? ""} addresses={addresses ?? []}/></div></section></main></>;
}
