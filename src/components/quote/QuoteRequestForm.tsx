"use client";

import { useActionState } from "react";
import {
  createQuoteRequestAction,
  type QuoteRequestActionState,
} from "@/lib/quote/actions";

type QuoteRequestFormProps = {
  productSku?: string;
  productName?: string;
  minimumQuantity?: number;
};

const initialState: QuoteRequestActionState = {
  success: false,
  message: "",
};

export default function QuoteRequestForm({
  productSku,
  productName,
  minimumQuantity = 1,
}: QuoteRequestFormProps) {
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
            Produto seleccionado
          </p>

          <p className="mt-1 text-sm text-neutral-600">
            {productName ?? "Produto"} {productSku ? `(${productSku})` : ""}
          </p>
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label
            htmlFor="contactName"
            className="block text-sm font-medium text-neutral-700"
          >
            Nome completo *
          </label>

          <input
            id="contactName"
            name="contactName"
            type="text"
            required
            className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
            placeholder="Nome e apelido"
          />
        </div>

        <div>
          <label
            htmlFor="contactEmail"
            className="block text-sm font-medium text-neutral-700"
          >
            E-mail *
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
            Telefone
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
            Preferência de contacto
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
            Empresa
          </label>

          <input
            id="companyName"
            name="companyName"
            type="text"
            className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
            placeholder="Nome da empresa"
          />
        </div>

        <div>
          <label
            htmlFor="companyTaxId"
            className="block text-sm font-medium text-neutral-700"
          >
            NIF da empresa
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
            Quantidade *
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
            Data pretendida
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
            Orçamento mínimo
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
            Orçamento máximo
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
          Assunto
        </label>

        <input
          id="subject"
          name="subject"
          type="text"
          className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
          placeholder="Pedido de orçamento"
        />
      </div>

      <div>
        <label
          htmlFor="personalizationNotes"
          className="block text-sm font-medium text-neutral-700"
        >
          Notas de personalização
        </label>

        <textarea
          id="personalizationNotes"
          name="personalizationNotes"
          rows={4}
          className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
          placeholder="Indica cores, posição do logótipo, técnica pretendida ou outras instruções."
        />
      </div>

      <div>
        <label
          htmlFor="message"
          className="block text-sm font-medium text-neutral-700"
        >
          Mensagem
        </label>

        <textarea
          id="message"
          name="message"
          rows={5}
          className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
          placeholder="Descreve o contexto do pedido, evento, prazo ou objectivo da campanha."
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
        {isPending ? "A enviar pedido..." : "Enviar pedido de orçamento"}
      </button>
    </form>
  );
}