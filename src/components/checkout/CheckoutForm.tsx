"use client";

import { useActionState, useState } from "react";
import {
  Building2,
  Check,
  Mail,
  MapPin,
  Truck,
} from "lucide-react";
import {
  saveCheckoutDestinationAction,
  type CheckoutDestinationActionState,
} from "@/lib/checkout/actions";
import type { SiteLocale } from "@/lib/i18n/config";

export type CheckoutSavedAddress = {
  id: string;
  company_name: string | null;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  address_line_1: string;
  address_line_2: string | null;
  postal_code: string;
  city: string;
  district: string | null;
  country_code: string;
  is_default: boolean;
};

type CheckoutFormProps = {
  cartId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  companyName: string;
  companyTaxId: string;
  artworkEmail: string;
  customerNotes: string;
  selectedAddressId: string | null;
  savedAddresses: CheckoutSavedAddress[];
  locale: SiteLocale;
};

const initialState: CheckoutDestinationActionState = {
  success: false,
  message: "",
};

export default function CheckoutForm({
  cartId,
  customerName,
  customerEmail,
  customerPhone,
  companyName,
  companyTaxId,
  artworkEmail,
  customerNotes,
  selectedAddressId,
  savedAddresses,
  locale,
}: CheckoutFormProps) {
  const text = locale === "en" ? {
    customer: "Customer details", customerHint: "Details used for the order and billing.", fullName: "Full name *", phone: "Phone", company: "Company", companyPlaceholder: "Company name", save: "Save to account", saveHint: "These details will be available for future orders and can be changed in My Account.", defaultAddress: "Set this as my preferred delivery address.", billing: "Use this address for billing as well.", delivery: "Delivery address", deliveryHint: "Choose a saved address or add a new one.", useSaved: "Use saved address", chooseSaved: "Choose an address linked to your account.", addNew: "Add new address", addNewHint: "Save a new delivery address.", contact: "Contact person", receiving: "Name of the person receiving", addressCompany: "Company at address", companyEntity: "Company or organisation", deliveryPhone: "Delivery phone", address: "Address *", addressPlaceholder: "Street, number and unit", addressExtra: "Additional address", addressExtraPlaceholder: "Warehouse, floor, door or other details", postal: "Postcode *", city: "City *", district: "Region", country: "Country", artwork: "Artwork and notes", artworkHint: "Enter where you wish to receive artwork approval.", artworkEmail: "Artwork approval email *", notes: "Order notes", notesPlaceholder: "Additional delivery information, access instructions or other relevant details.", saving: "Saving destination...", continue: "Continue to shipping"
  } : locale === "fr" ? {
    customer: "Coordonnées client", customerHint: "Coordonnées utilisées pour la commande et la facturation.", fullName: "Nom complet *", phone: "Téléphone", company: "Entreprise", companyPlaceholder: "Nom de l’entreprise", save: "Enregistrer dans le compte", saveHint: "Ces informations seront disponibles pour les prochaines commandes et modifiables dans Mon compte.", defaultAddress: "Définir comme adresse de livraison préférée.", billing: "Utiliser également cette adresse pour la facturation.", delivery: "Adresse de livraison", deliveryHint: "Choisissez une adresse enregistrée ou ajoutez-en une nouvelle.", useSaved: "Utiliser une adresse enregistrée", chooseSaved: "Choisir une adresse liée à votre compte.", addNew: "Ajouter une adresse", addNewHint: "Enregistrer une nouvelle adresse de livraison.", contact: "Personne de contact", receiving: "Nom de la personne qui reçoit", addressCompany: "Entreprise à l’adresse", companyEntity: "Entreprise ou organisme", deliveryPhone: "Téléphone de livraison", address: "Adresse *", addressPlaceholder: "Rue, numéro et complément", addressExtra: "Complément d’adresse", addressExtraPlaceholder: "Entrepôt, étage, porte ou autre indication", postal: "Code postal *", city: "Ville *", district: "Région", country: "Pays", artwork: "Maquette et observations", artworkHint: "Indiquez où vous souhaitez recevoir la validation de la maquette.", artworkEmail: "E-mail de validation de la maquette *", notes: "Observations sur la commande", notesPlaceholder: "Informations de livraison, accès ou autres indications utiles.", saving: "Enregistrement...", continue: "Continuer vers l’expédition"
  } : {
    customer: "Dados do cliente", customerHint: "Dados utilizados na encomenda e na faturação.", fullName: "Nome completo *", phone: "Telefone", company: "Empresa", companyPlaceholder: "Nome da empresa", save: "Guardar na conta", saveHint: "Estes dados ficarão disponíveis para as próximas encomendas e podem ser alterados na Área Cliente.", defaultAddress: "Definir esta como a minha morada de entrega preferida.", billing: "Utilizar também esta morada para faturação.", delivery: "Morada de entrega", deliveryHint: "Escolhe uma morada guardada ou adiciona uma nova.", useSaved: "Utilizar morada guardada", chooseSaved: "Escolher uma morada associada à conta.", addNew: "Adicionar nova morada", addNewHint: "Guardar uma nova morada de entrega.", contact: "Pessoa de contacto", receiving: "Nome de quem recebe", addressCompany: "Empresa na morada", companyEntity: "Empresa ou entidade", deliveryPhone: "Telefone para entrega", address: "Morada *", addressPlaceholder: "Rua, avenida, número e fração", addressExtra: "Morada complementar", addressExtraPlaceholder: "Armazém, piso, porta ou outra indicação", postal: "Código postal *", city: "Localidade *", district: "Distrito", country: "País", artwork: "Maquete e observações", artworkHint: "Indica onde pretendes receber a validação da maquete.", artworkEmail: "E-mail para receção da maquete *", notes: "Observações da encomenda", notesPlaceholder: "Informações adicionais sobre a entrega, horários, acessos ou outras indicações relevantes.", saving: "A guardar destino...", continue: "Continuar para expedição"
  };
  const defaultSavedAddress =
    savedAddresses.find(
      (address) => address.id === selectedAddressId,
    ) ??
    savedAddresses.find((address) => address.is_default) ??
    savedAddresses[0] ??
    null;

  const [addressMode, setAddressMode] = useState<"saved" | "new">(
    defaultSavedAddress ? "saved" : "new",
  );

  const [activeAddressId, setActiveAddressId] = useState(
    defaultSavedAddress?.id ?? "",
  );

  const [state, formAction, isPending] = useActionState(
    saveCheckoutDestinationAction,
    initialState,
  );

  return (
    <form action={formAction} className="mt-8 space-y-8">
      <input type="hidden" name="cartId" value={cartId} />
      <input type="hidden" name="locale" value={locale} />

      <input
        type="hidden"
        name="addressMode"
        value={addressMode}
      />

      <input
        type="hidden"
        name="selectedAddressId"
        value={activeAddressId}
      />

      <section>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-neutral-100 p-3">
            <Building2 className="h-5 w-5 text-neutral-600" />
          </div>

          <div>
            <h2 className="text-xl font-semibold text-neutral-950">
              {text.customer}
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              {text.customerHint}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div>
            <label
              htmlFor="customerName"
              className="block text-sm font-medium text-neutral-700"
            >
              {text.fullName}
            </label>

            <input
              id="customerName"
              name="customerName"
              type="text"
              required
              defaultValue={customerName}
              autoComplete="name"
              className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
            />
          </div>

          <div>
            <label
              htmlFor="customerEmail"
              className="block text-sm font-medium text-neutral-700"
            >
              E-mail *
            </label>

            <input
              id="customerEmail"
              name="customerEmail"
              type="email"
              required
              defaultValue={customerEmail}
              autoComplete="email"
              className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
            />
          </div>

          <div>
            <label
              htmlFor="customerPhone"
              className="block text-sm font-medium text-neutral-700"
            >
              {text.phone}
            </label>

            <input
              id="customerPhone"
              name="customerPhone"
              type="tel"
              defaultValue={customerPhone}
              autoComplete="tel"
              placeholder="+351 900 000 000"
              className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
            />
          </div>

          <div>
            <label
              htmlFor="companyName"
              className="block text-sm font-medium text-neutral-700"
            >
              {text.company}
            </label>

            <input
              id="companyName"
              name="companyName"
              type="text"
              defaultValue={companyName}
              autoComplete="organization"
              placeholder={text.companyPlaceholder}
              className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
            />
          </div>

          <div>
            <label
              htmlFor="companyTaxId"
              className="block text-sm font-medium text-neutral-700"
            >
              NIF
            </label>

            <input
              id="companyTaxId"
              name="companyTaxId"
              type="text"
              defaultValue={companyTaxId}
              inputMode="numeric"
              placeholder="000 000 000"
              className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
            />
          </div>
        </div>
      </section>

      <section className="border-t border-neutral-200 pt-8">
        <h2 className="text-xl font-semibold text-neutral-950">{text.save}</h2>
        <p className="mt-1 text-sm text-neutral-500">{text.saveHint}</p>
        <div className="mt-5 space-y-3 rounded-2xl bg-neutral-50 p-4">
          <label className="flex items-start gap-3 text-sm text-neutral-700">
            <input type="checkbox" name="makeShippingDefault" defaultChecked className="mt-0.5 h-4 w-4" />
            <span>{text.defaultAddress}</span>
          </label>
          <label className="flex items-start gap-3 text-sm text-neutral-700">
            <input type="checkbox" name="billingSameAsShipping" defaultChecked className="mt-0.5 h-4 w-4" />
            <span>{text.billing}</span>
          </label>
        </div>
      </section>

      <section className="border-t border-neutral-200 pt-8">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-neutral-100 p-3">
            <MapPin className="h-5 w-5 text-neutral-600" />
          </div>

          <div>
            <h2 className="text-xl font-semibold text-neutral-950">
              {text.delivery}
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              {text.deliveryHint}
            </p>
          </div>
        </div>

        {savedAddresses.length > 0 ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setAddressMode("saved")}
              className={`rounded-2xl border p-4 text-left transition ${
                addressMode === "saved"
                  ? "border-neutral-950 bg-neutral-950 text-white"
                  : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"
              }`}
            >
              <span className="block text-sm font-semibold">
                {text.useSaved}
              </span>

              <span
                className={`mt-1 block text-xs ${
                  addressMode === "saved"
                    ? "text-neutral-300"
                    : "text-neutral-500"
                }`}
              >
                {text.chooseSaved}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setAddressMode("new")}
              className={`rounded-2xl border p-4 text-left transition ${
                addressMode === "new"
                  ? "border-neutral-950 bg-neutral-950 text-white"
                  : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"
              }`}
            >
              <span className="block text-sm font-semibold">
                {text.addNew}
              </span>

              <span
                className={`mt-1 block text-xs ${
                  addressMode === "new"
                    ? "text-neutral-300"
                    : "text-neutral-500"
                }`}
              >
                {text.addNewHint}
              </span>
            </button>
          </div>
        ) : null}

        {addressMode === "saved" && savedAddresses.length > 0 ? (
          <div className="mt-5 space-y-3">
            {savedAddresses.map((address) => {
              const isSelected =
                address.id === activeAddressId;

              return (
                <button
                  key={address.id}
                  type="button"
                  onClick={() => setActiveAddressId(address.id)}
                  className={`flex w-full items-start justify-between gap-4 rounded-2xl border p-4 text-left transition ${
                    isSelected
                      ? "border-neutral-950 bg-neutral-50"
                      : "border-neutral-200 bg-white hover:border-neutral-400"
                  }`}
                >
                  <div>
                    <p className="font-semibold text-neutral-950">
                      {address.company_name ??
                        address.contact_name}
                    </p>

                    {address.company_name ? (
                      <p className="mt-1 text-sm text-neutral-600">
                        {address.contact_name}
                      </p>
                    ) : null}

                    <p className="mt-2 text-sm leading-6 text-neutral-600">
                      {address.address_line_1}
                      {address.address_line_2
                        ? `, ${address.address_line_2}`
                        : ""}
                      <br />
                      {address.postal_code} {address.city}
                      {address.district
                        ? ` · ${address.district}`
                        : ""}
                      <br />
                      {address.country_code}
                    </p>
                  </div>

                  <div
                    className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                      isSelected
                        ? "border-neutral-950 bg-neutral-950 text-white"
                        : "border-neutral-300 bg-white text-transparent"
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div>
              <label
                htmlFor="shippingContactName"
                className="block text-sm font-medium text-neutral-700"
              >
                {text.contact}
              </label>

              <input
                id="shippingContactName"
                name="shippingContactName"
                type="text"
                autoComplete="name"
                placeholder={text.receiving}
                className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
              />
            </div>

            <div>
              <label
                htmlFor="shippingCompanyName"
                className="block text-sm font-medium text-neutral-700"
              >
                {text.addressCompany}
              </label>

              <input
                id="shippingCompanyName"
                name="shippingCompanyName"
                type="text"
                autoComplete="organization"
                placeholder={text.companyEntity}
                className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
              />
            </div>

            <div>
              <label
                htmlFor="shippingPhone"
                className="block text-sm font-medium text-neutral-700"
              >
                {text.deliveryPhone}
              </label>

              <input
                id="shippingPhone"
                name="shippingPhone"
                type="tel"
                autoComplete="tel"
                placeholder="+351 900 000 000"
                className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="shippingAddressLine1"
                className="block text-sm font-medium text-neutral-700"
              >
                {text.address}
              </label>

              <input
                id="shippingAddressLine1"
                name="shippingAddressLine1"
                type="text"
                required={addressMode === "new"}
                autoComplete="address-line1"
                placeholder={text.addressPlaceholder}
                className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="shippingAddressLine2"
                className="block text-sm font-medium text-neutral-700"
              >
                {text.addressExtra}
              </label>

              <input
                id="shippingAddressLine2"
                name="shippingAddressLine2"
                type="text"
                autoComplete="address-line2"
                placeholder={text.addressExtraPlaceholder}
                className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
              />
            </div>

            <div>
              <label
                htmlFor="shippingPostalCode"
                className="block text-sm font-medium text-neutral-700"
              >
                {text.postal}
              </label>

              <input
                id="shippingPostalCode"
                name="shippingPostalCode"
                type="text"
                required={addressMode === "new"}
                autoComplete="postal-code"
                placeholder="0000-000"
                className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
              />
            </div>

            <div>
              <label
                htmlFor="shippingCity"
                className="block text-sm font-medium text-neutral-700"
              >
                {text.city}
              </label>

              <input
                id="shippingCity"
                name="shippingCity"
                type="text"
                required={addressMode === "new"}
                autoComplete="address-level2"
                className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
              />
            </div>

            <div>
              <label
                htmlFor="shippingDistrict"
                className="block text-sm font-medium text-neutral-700"
              >
                {text.district}
              </label>

              <input
                id="shippingDistrict"
                name="shippingDistrict"
                type="text"
                autoComplete="address-level1"
                className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
              />
            </div>

            <div>
              <label
                htmlFor="shippingCountryCode"
                className="block text-sm font-medium text-neutral-700"
              >
                {text.country}
              </label>

              <select
                id="shippingCountryCode"
                name="shippingCountryCode"
                defaultValue="PT"
                autoComplete="country"
                className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
              >
                <option value="PT">Portugal</option>
              </select>
            </div>
          </div>
        )}
      </section>

      <section className="border-t border-neutral-200 pt-8">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-neutral-100 p-3">
            <Mail className="h-5 w-5 text-neutral-600" />
          </div>

          <div>
            <h2 className="text-xl font-semibold text-neutral-950">
              {text.artwork}
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              {text.artworkHint}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <label
            htmlFor="artworkEmail"
            className="block text-sm font-medium text-neutral-700"
          >
            {text.artworkEmail}
          </label>

          <input
            id="artworkEmail"
            name="artworkEmail"
            type="email"
            required
            defaultValue={artworkEmail || customerEmail}
            className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
          />
        </div>

        <div className="mt-5">
          <label
            htmlFor="customerNotes"
            className="block text-sm font-medium text-neutral-700"
          >
            {text.notes}
          </label>

          <textarea
            id="customerNotes"
            name="customerNotes"
            rows={4}
            defaultValue={customerNotes}
            maxLength={1000}
            placeholder={text.notesPlaceholder}
            className="mt-2 w-full resize-none rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
          />
        </div>
      </section>

      {state.message ? (
        <div
          className={`rounded-2xl px-4 py-3 text-sm ${
            state.success
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {state.message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={
          isPending ||
          (addressMode === "saved" && !activeAddressId)
        }
        className="inline-flex w-full items-center justify-center rounded-2xl bg-neutral-950 px-6 py-4 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Truck className="mr-2 h-4 w-4" />

        {isPending
          ? text.saving
          : text.continue}
      </button>
    </form>
  );
}
