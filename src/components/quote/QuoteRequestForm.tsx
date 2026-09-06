"use client";

import { useActionState } from "react";
import {
  createQuoteRequestAction,
  type QuoteRequestActionState,
} from "@/lib/quote/actions";
import type { SiteLocale } from "@/lib/i18n/config";

type QuoteRequestFormProps = {
  locale: SiteLocale;
  productSku?: string;
  productName?: string;
  minimumQuantity?: number;
};

const initialState: QuoteRequestActionState = {
  success: false,
  message: "",
};

export default function QuoteRequestForm({
  locale,
  productSku,
  productName,
  minimumQuantity = 1,
}: QuoteRequestFormProps) {
  const text = locale === "en" ? {
    selected: "Selected product", product: "Product", name: "Full name *", namePlaceholder: "First and last name", email: "Email *", phone: "Phone", preference: "Preferred contact method", company: "Company", companyPlaceholder: "Company name", taxId: "Company tax number", quantity: "Quantity *", date: "Required delivery date", budgetMin: "Minimum budget", budgetMax: "Maximum budget", subject: "Subject", subjectPlaceholder: "Quotation request", notes: "Customisation notes", notesPlaceholder: "Tell us the colours, logo position, required technique or other instructions.", message: "Message", messagePlaceholder: "Describe the request, event, deadline or campaign objective.", sending: "Sending request...", submit: "Send quotation request",
  } : locale === "fr" ? {
    selected: "Produit sélectionné", product: "Produit", name: "Nom complet *", namePlaceholder: "Prénom et nom", email: "E-mail *", phone: "Téléphone", preference: "Mode de contact préféré", company: "Entreprise", companyPlaceholder: "Nom de l’entreprise", taxId: "Numéro fiscal de l’entreprise", quantity: "Quantité *", date: "Date de livraison souhaitée", budgetMin: "Budget minimum", budgetMax: "Budget maximum", subject: "Objet", subjectPlaceholder: "Demande de devis", notes: "Notes de personnalisation", notesPlaceholder: "Indiquez les couleurs, la position du logo, la technique souhaitée ou toute autre instruction.", message: "Message", messagePlaceholder: "Décrivez la demande, l’événement, le délai ou l’objectif de la campagne.", sending: "Envoi de la demande...", submit: "Envoyer la demande de devis",
  } : {
    selected: "Produto selecionado", product: "Produto", name: "Nome completo *", namePlaceholder: "Nome e apelido", email: "E-mail *", phone: "Telefone", preference: "Preferência de contacto", company: "Empresa", companyPlaceholder: "Nome da empresa", taxId: "NIF da empresa", quantity: "Quantidade *", date: "Data pretendida", budgetMin: "Orçamento mínimo", budgetMax: "Orçamento máximo", subject: "Assunto", subjectPlaceholder: "Pedido de orçamento", notes: "Notas de personalização", notesPlaceholder: "Indica cores, posição do logótipo, técnica pretendida ou outras instruções.", message: "Mensagem", messagePlaceholder: "Descreve o contexto do pedido, evento, prazo ou objetivo da campanha.", sending: "A enviar pedido...", submit: "Enviar pedido de orçamento",
  };
  const [state, formAction, isPending] = useActionState(
    createQuoteRequestAction,
    initialState,
  );

  return (
    <form action={formAction} className="mt-8 space-y-6">
      <input type="hidden" name="productSku" value={productSku ?? ""} />
      <input type="hidden" name="productName" value={productName ?? ""} />

      {productSku || productName ? (
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-sm font-semibold text-neutral-950">
            {text.selected}
          </p>

          <p className="mt-1 text-sm text-neutral-600">
            {productName ?? text.product} {productSku ? `(${productSku})` : ""}
          </p>
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label
            htmlFor="contactName"
            className="block text-sm font-medium text-neutral-700"
          >
            {text.name}
          </label>

          <input
            id="contactName"
            name="contactName"
            type="text"
            required
            className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
            placeholder={text.namePlaceholder}
          />
        </div>

        <div>
          <label
            htmlFor="contactEmail"
            className="block text-sm font-medium text-neutral-700"
          >
            {text.email}
          </label>

          <input
            id="contactEmail"
            name="contactEmail"
            type="email"
            required
            className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
            placeholder="email@empresa.pt"
          />
        </div>

        <div>
          <label
            htmlFor="contactPhone"
            className="block text-sm font-medium text-neutral-700"
          >
            {text.phone}
          </label>

          <input
            id="contactPhone"
            name="contactPhone"
            type="tel"
            className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
            placeholder="+351 900 000 000"
          />
        </div>

        <div>
          <label
            htmlFor="preferredContactMethod"
            className="block text-sm font-medium text-neutral-700"
          >
            {text.preference}
          </label>

          <select
            id="preferredContactMethod"
            name="preferredContactMethod"
            defaultValue="email"
            className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
          >
            <option value="email">E-mail</option>
            <option value="phone">Telefone</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
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
            className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
            placeholder={text.companyPlaceholder}
          />
        </div>

        <div>
          <label
            htmlFor="companyTaxId"
            className="block text-sm font-medium text-neutral-700"
          >
            {text.taxId}
          </label>

          <input
            id="companyTaxId"
            name="companyTaxId"
            type="text"
            className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
            placeholder="PT 000 000 000"
          />
        </div>

        <div>
          <label
            htmlFor="quantity"
            className="block text-sm font-medium text-neutral-700"
          >
            {text.quantity}
          </label>

          <input
            id="quantity"
            name="quantity"
            type="number"
            min={minimumQuantity}
            defaultValue={minimumQuantity}
            required
            className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
          />
        </div>

        <div>
          <label
            htmlFor="desiredDeliveryDate"
            className="block text-sm font-medium text-neutral-700"
          >
            {text.date}
          </label>

          <input
            id="desiredDeliveryDate"
            name="desiredDeliveryDate"
            type="date"
            className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
          />
        </div>

        <div>
          <label
            htmlFor="budgetMin"
            className="block text-sm font-medium text-neutral-700"
          >
            {text.budgetMin}
          </label>

          <input
            id="budgetMin"
            name="budgetMin"
            type="number"
            step="0.01"
            min="0"
            className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
            placeholder="Ex: 500"
          />
        </div>

        <div>
          <label
            htmlFor="budgetMax"
            className="block text-sm font-medium text-neutral-700"
          >
            {text.budgetMax}
          </label>

          <input
            id="budgetMax"
            name="budgetMax"
            type="number"
            step="0.01"
            min="0"
            className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
            placeholder="Ex: 1500"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="subject"
          className="block text-sm font-medium text-neutral-700"
        >
          {text.subject}
        </label>

        <input
          id="subject"
          name="subject"
          type="text"
          className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
          placeholder={text.subjectPlaceholder}
        />
      </div>

      <div>
        <label
          htmlFor="personalizationNotes"
          className="block text-sm font-medium text-neutral-700"
        >
          {text.notes}
        </label>

        <textarea
          id="personalizationNotes"
          name="personalizationNotes"
          rows={4}
          className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
          placeholder={text.notesPlaceholder}
        />
      </div>

      <div>
        <label
          htmlFor="message"
          className="block text-sm font-medium text-neutral-700"
        >
          {text.message}
        </label>

        <textarea
          id="message"
          name="message"
          rows={5}
          className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
          placeholder={text.messagePlaceholder}
        />
      </div>

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
        disabled={isPending}
        className="inline-flex w-full items-center justify-center rounded-2xl bg-neutral-950 px-6 py-4 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? text.sending : text.submit}
      </button>
    </form>
  );
}
