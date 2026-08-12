"use client";

import { useActionState, type InputHTMLAttributes } from "react";
import { Building2, Check, MapPin, Plus, Trash2 } from "lucide-react";
import { addCustomerAddressAction, deleteCustomerAddressAction, setPreferredAddressAction, updateCustomerDataAction } from "./actions";

export type CustomerAddress = {
  id: string; address_type: "shipping" | "billing"; label: string | null; company_name: string | null; tax_id: string | null;
  contact_name: string; contact_email: string | null; contact_phone: string | null; address_line_1: string; address_line_2: string | null;
  postal_code: string; city: string; district: string | null; country_code: string; is_default: boolean;
};
type Props = { fullName: string; email: string; phone: string; companyName: string; taxId: string; billingEmail: string; addresses: CustomerAddress[] };
const initial = { success: false, message: "" };
const input = "mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10";

export default function CustomerDataForm(props: Props) {
  const [profileState, profileAction, profilePending] = useActionState(updateCustomerDataAction, initial);
  const [addressState, addressAction, addressPending] = useActionState(addCustomerAddressAction, initial);
  return <div className="mt-8 space-y-10">
    <form action={profileAction} className="rounded-3xl border border-neutral-200 p-6">
      <div className="flex items-center gap-3"><Building2 className="h-5 w-5"/><h2 className="text-xl font-semibold">Contacto e faturação</h2></div>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <Field label="Nome completo *" name="full_name" defaultValue={props.fullName} required/><Field label="E-mail da conta" name="account_email" defaultValue={props.email} disabled/>
        <Field label="Telefone" name="phone" defaultValue={props.phone} type="tel"/><Field label="Empresa" name="company_name" defaultValue={props.companyName}/>
        <Field label="NIF" name="tax_id" defaultValue={props.taxId} inputMode="numeric"/><Field label="E-mail de faturação" name="billing_email" defaultValue={props.billingEmail} type="email"/>
      </div><Feedback state={profileState}/><button disabled={profilePending} className="mt-6 rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{profilePending ? "A guardar..." : "Guardar dados"}</button>
    </form>
    <AddressList title="Moradas de entrega" type="shipping" addresses={props.addresses.filter((a) => a.address_type === "shipping")}/>
    <AddressList title="Moradas de faturação" type="billing" addresses={props.addresses.filter((a) => a.address_type === "billing")}/>
    <form action={addressAction} className="rounded-3xl border border-neutral-200 p-6">
      <div className="flex items-center gap-3"><Plus className="h-5 w-5"/><h2 className="text-xl font-semibold">Adicionar morada</h2></div>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <div><label className="text-sm font-medium">Tipo *</label><select name="address_type" className={input}><option value="shipping">Entrega</option><option value="billing">Faturação</option></select></div>
        <Field label="Nome da morada" name="label" placeholder="Ex.: Escritório, Armazém"/><Field label="Pessoa de contacto *" name="contact_name" required/>
        <Field label="Empresa" name="company_name" defaultValue={props.companyName}/><Field label="E-mail de contacto" name="contact_email" type="email" defaultValue={props.billingEmail || props.email}/>
        <Field label="Telefone de contacto" name="contact_phone" type="tel" defaultValue={props.phone}/><Field label="NIF" name="tax_id" defaultValue={props.taxId}/>
        <div className="md:col-span-2"><Field label="Morada *" name="address_line_1" required/></div><div className="md:col-span-2"><Field label="Complemento" name="address_line_2" placeholder="Piso, porta, armazém..."/></div>
        <Field label="Código postal *" name="postal_code" required placeholder="0000-000"/><Field label="Localidade *" name="city" required/><Field label="Distrito" name="district"/><Field label="País" name="country" defaultValue="Portugal" disabled/>
      </div>
      <label className="mt-5 flex items-center gap-3 text-sm"><input type="checkbox" name="is_default" className="h-4 w-4"/>Definir como morada preferida deste tipo</label>
      <Feedback state={addressState}/><button disabled={addressPending} className="mt-6 rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{addressPending ? "A guardar..." : "Adicionar morada"}</button>
    </form>
  </div>;
}

function Field({ label, name, ...props }: { label: string; name: string } & InputHTMLAttributes<HTMLInputElement>) {
  return <div><label htmlFor={name} className="text-sm font-medium">{label}</label><input id={name} name={name} className={input} {...props}/></div>;
}
function Feedback({ state }: { state: { success: boolean; message: string } }) {
  return state.message ? <div className={`mt-5 rounded-2xl px-4 py-3 text-sm ${state.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{state.message}</div> : null;
}
function AddressList({ title, type, addresses }: { title: string; type: "shipping" | "billing"; addresses: CustomerAddress[] }) {
  return <section className="rounded-3xl border border-neutral-200 p-6"><div className="flex items-center gap-3"><MapPin className="h-5 w-5"/><h2 className="text-xl font-semibold">{title}</h2></div>
    {addresses.length ? <div className="mt-5 grid gap-4 md:grid-cols-2">{addresses.map((address) => <article key={address.id} className="rounded-2xl border border-neutral-200 p-5">
      <div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{address.label || address.company_name || address.contact_name}</p>{address.is_default ? <span className="mt-2 inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"><Check className="mr-1 h-3 w-3"/>Preferida</span> : null}</div><form action={deleteCustomerAddressAction}><input type="hidden" name="id" value={address.id}/><input type="hidden" name="address_type" value={type}/><button aria-label="Eliminar morada" className="rounded-full p-2 text-neutral-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4"/></button></form></div>
      <p className="mt-4 text-sm leading-6 text-neutral-600">{address.contact_name}<br/>{address.address_line_1}{address.address_line_2 ? `, ${address.address_line_2}` : ""}<br/>{address.postal_code} {address.city}{address.district ? ` · ${address.district}` : ""}</p>
      {!address.is_default ? <form action={setPreferredAddressAction} className="mt-4"><input type="hidden" name="id" value={address.id}/><input type="hidden" name="address_type" value={type}/><button className="text-sm font-semibold underline underline-offset-4">Definir como preferida</button></form> : null}
    </article>)}</div> : <p className="mt-5 rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-600">Ainda não tens nenhuma morada guardada.</p>}
  </section>;
}
