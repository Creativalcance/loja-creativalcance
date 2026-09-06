"use client";

import { useActionState, type InputHTMLAttributes } from "react";
import { Building2, Check, MapPin, Plus, Trash2 } from "lucide-react";
import { addCustomerAddressAction, deleteCustomerAddressAction, setPreferredAddressAction, updateCustomerDataAction } from "./actions";
import type { SiteLocale } from "@/lib/i18n/config";

export type CustomerAddress = {
  id: string; address_type: "shipping" | "billing"; label: string | null; company_name: string | null; tax_id: string | null;
  contact_name: string; contact_email: string | null; contact_phone: string | null; address_line_1: string; address_line_2: string | null;
  postal_code: string; city: string; district: string | null; country_code: string; is_default: boolean;
};
type Props = { locale: SiteLocale; fullName: string; email: string; phone: string; companyName: string; taxId: string; billingEmail: string; addresses: CustomerAddress[] };
const initial = { success: false, message: "" };
const input = "mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10";

export default function CustomerDataForm(props: Props) {
  const t = dataCopy[props.locale];
  const [profileState, profileAction, profilePending] = useActionState(updateCustomerDataAction, initial);
  const [addressState, addressAction, addressPending] = useActionState(addCustomerAddressAction, initial);
  return <div className="mt-8 space-y-10">
    <form action={profileAction} className="rounded-3xl border border-neutral-200 p-6"><input type="hidden" name="locale" value={props.locale}/>
      <div className="flex items-center gap-3"><Building2 className="h-5 w-5"/><h2 className="text-xl font-semibold">{t.contactBilling}</h2></div>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <Field label={`${t.fullName} *`} name="full_name" defaultValue={props.fullName} required/><Field label={t.accountEmail} name="account_email" defaultValue={props.email} disabled/>
        <Field label={t.phone} name="phone" defaultValue={props.phone} type="tel"/><Field label={t.company} name="company_name" defaultValue={props.companyName}/>
        <Field label={t.taxId} name="tax_id" defaultValue={props.taxId} inputMode="numeric"/><Field label={t.billingEmail} name="billing_email" defaultValue={props.billingEmail} type="email"/>
      </div><Feedback state={profileState}/><button disabled={profilePending} className="mt-6 rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{profilePending ? t.saving : t.save}</button>
    </form>
    <AddressList title={t.shippingAddresses} type="shipping" addresses={props.addresses.filter((a) => a.address_type === "shipping")} locale={props.locale}/>
    <AddressList title={t.billingAddresses} type="billing" addresses={props.addresses.filter((a) => a.address_type === "billing")} locale={props.locale}/>
    <form action={addressAction} className="rounded-3xl border border-neutral-200 p-6"><input type="hidden" name="locale" value={props.locale}/>
      <div className="flex items-center gap-3"><Plus className="h-5 w-5"/><h2 className="text-xl font-semibold">{t.addAddress}</h2></div>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <div><label className="text-sm font-medium">{t.type} *</label><select name="address_type" className={input}><option value="shipping">{t.shipping}</option><option value="billing">{t.billing}</option></select></div>
        <Field label={t.addressName} name="label" placeholder={t.addressExample}/><Field label={`${t.contactPerson} *`} name="contact_name" required/>
        <Field label={t.company} name="company_name" defaultValue={props.companyName}/><Field label={t.contactEmail} name="contact_email" type="email" defaultValue={props.billingEmail || props.email}/>
        <Field label={t.contactPhone} name="contact_phone" type="tel" defaultValue={props.phone}/><Field label={t.taxId} name="tax_id" defaultValue={props.taxId}/>
        <div className="md:col-span-2"><Field label={`${t.address} *`} name="address_line_1" required/></div><div className="md:col-span-2"><Field label={t.addressExtra} name="address_line_2" placeholder={t.addressExtraExample}/></div>
        <Field label={`${t.postalCode} *`} name="postal_code" required placeholder="0000-000"/><Field label={`${t.city} *`} name="city" required/><Field label={t.district} name="district"/><Field label={t.country} name="country" defaultValue="Portugal" disabled/>
      </div>
      <label className="mt-5 flex items-center gap-3 text-sm"><input type="checkbox" name="is_default" className="h-4 w-4"/>{t.makePreferred}</label>
      <Feedback state={addressState}/><button disabled={addressPending} className="mt-6 rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{addressPending ? t.saving : t.addAddress}</button>
    </form>
  </div>;
}

function Field({ label, name, ...props }: { label: string; name: string } & InputHTMLAttributes<HTMLInputElement>) {
  return <div><label htmlFor={name} className="text-sm font-medium">{label}</label><input id={name} name={name} className={input} {...props}/></div>;
}
function Feedback({ state }: { state: { success: boolean; message: string } }) {
  return state.message ? <div className={`mt-5 rounded-2xl px-4 py-3 text-sm ${state.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{state.message}</div> : null;
}
function AddressList({ title, type, addresses, locale }: { title: string; type: "shipping" | "billing"; addresses: CustomerAddress[]; locale: SiteLocale }) {
  const t = dataCopy[locale];
  return <section className="rounded-3xl border border-neutral-200 p-6"><div className="flex items-center gap-3"><MapPin className="h-5 w-5"/><h2 className="text-xl font-semibold">{title}</h2></div>
    {addresses.length ? <div className="mt-5 grid gap-4 md:grid-cols-2">{addresses.map((address) => <article key={address.id} className="rounded-2xl border border-neutral-200 p-5">
      <div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{address.label || address.company_name || address.contact_name}</p>{address.is_default ? <span className="mt-2 inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"><Check className="mr-1 h-3 w-3"/>{t.preferred}</span> : null}</div><form action={deleteCustomerAddressAction}><input type="hidden" name="locale" value={locale}/><input type="hidden" name="id" value={address.id}/><input type="hidden" name="address_type" value={type}/><button aria-label={t.deleteAddress} className="rounded-full p-2 text-neutral-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4"/></button></form></div>
      <p className="mt-4 text-sm leading-6 text-neutral-600">{address.contact_name}<br/>{address.address_line_1}{address.address_line_2 ? `, ${address.address_line_2}` : ""}<br/>{address.postal_code} {address.city}{address.district ? ` · ${address.district}` : ""}</p>
      {!address.is_default ? <form action={setPreferredAddressAction} className="mt-4"><input type="hidden" name="locale" value={locale}/><input type="hidden" name="id" value={address.id}/><input type="hidden" name="address_type" value={type}/><button className="text-sm font-semibold underline underline-offset-4">{t.setPreferred}</button></form> : null}
    </article>)}</div> : <p className="mt-5 rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-600">{t.noAddress}</p>}
  </section>;
}

const dataCopy = {
  pt: { contactBilling: "Contacto e faturação", fullName: "Nome completo", accountEmail: "E-mail da conta", phone: "Telefone", company: "Empresa", taxId: "NIF", billingEmail: "E-mail de faturação", saving: "A guardar...", save: "Guardar dados", shippingAddresses: "Moradas de entrega", billingAddresses: "Moradas de faturação", addAddress: "Adicionar morada", type: "Tipo", shipping: "Entrega", billing: "Faturação", addressName: "Nome da morada", addressExample: "Ex.: Escritório, Armazém", contactPerson: "Pessoa de contacto", contactEmail: "E-mail de contacto", contactPhone: "Telefone de contacto", address: "Morada", addressExtra: "Complemento", addressExtraExample: "Piso, porta, armazém...", postalCode: "Código postal", city: "Localidade", district: "Distrito", country: "País", makePreferred: "Definir como morada preferida deste tipo", preferred: "Preferida", deleteAddress: "Eliminar morada", setPreferred: "Definir como preferida", noAddress: "Ainda não tens nenhuma morada guardada." },
  en: { contactBilling: "Contact and billing", fullName: "Full name", accountEmail: "Account email", phone: "Phone", company: "Company", taxId: "Tax number", billingEmail: "Billing email", saving: "Saving...", save: "Save details", shippingAddresses: "Delivery addresses", billingAddresses: "Billing addresses", addAddress: "Add address", type: "Type", shipping: "Delivery", billing: "Billing", addressName: "Address name", addressExample: "E.g. Office, Warehouse", contactPerson: "Contact person", contactEmail: "Contact email", contactPhone: "Contact phone", address: "Address", addressExtra: "Address line 2", addressExtraExample: "Floor, door, warehouse...", postalCode: "Postcode", city: "City", district: "District", country: "Country", makePreferred: "Set as preferred address for this type", preferred: "Preferred", deleteAddress: "Delete address", setPreferred: "Set as preferred", noAddress: "You do not have any saved addresses yet." },
  fr: { contactBilling: "Contact et facturation", fullName: "Nom complet", accountEmail: "E-mail du compte", phone: "Téléphone", company: "Entreprise", taxId: "N° fiscal", billingEmail: "E-mail de facturation", saving: "Enregistrement...", save: "Enregistrer", shippingAddresses: "Adresses de livraison", billingAddresses: "Adresses de facturation", addAddress: "Ajouter une adresse", type: "Type", shipping: "Livraison", billing: "Facturation", addressName: "Nom de l’adresse", addressExample: "Ex. : Bureau, Entrepôt", contactPerson: "Personne de contact", contactEmail: "E-mail du contact", contactPhone: "Téléphone du contact", address: "Adresse", addressExtra: "Complément", addressExtraExample: "Étage, porte, entrepôt...", postalCode: "Code postal", city: "Ville", district: "Région", country: "Pays", makePreferred: "Définir comme adresse préférée de ce type", preferred: "Préférée", deleteAddress: "Supprimer l’adresse", setPreferred: "Définir comme préférée", noAddress: "Vous n’avez encore aucune adresse enregistrée." },
} satisfies Record<SiteLocale, Record<string, string>>;
