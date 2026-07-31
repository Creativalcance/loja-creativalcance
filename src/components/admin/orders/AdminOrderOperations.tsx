"use client";

import { useActionState } from "react";
import {
  BadgeCheck,
  FileText,
  PackageCheck,
  ReceiptText,
  Truck,
} from "lucide-react";
import {
  updateOrderArtworkAction,
  updateOrderInvoiceAction,
  updateOrderStatusAction,
  updateOrderTrackingAction,
  type AdminOrderActionState,
} from "@/lib/admin/orders/actions";

type AdminOrderStatusFormProps = {
  orderId: string;
  currentStatus: string;
  currentFulfillmentStatus: string;
};

type AdminTrackingFormProps = {
  orderId: string;
  shippingCarrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  isShipped: boolean;
};

type AdminInvoiceFormProps = {
  orderId: string;
  invoiceNumber: string | null;
  invoiceUrl: string | null;
  invoiceStatus: string | null;
};

type AdminArtworkFormProps = {
  orderId: string;
  orderItemId: string;
  productName: string;
  personalizationRequired: boolean;
  artworkStatus: string;
  artworkApproved: boolean;
};

const initialState: AdminOrderActionState = {
  success: false,
  message: "",
};

function StateMessage({
  state,
}: {
  state: AdminOrderActionState;
}) {
  if (!state.message) {
    return null;
  }

  return (
    <div
      className={`mt-4 rounded-2xl px-4 py-3 text-sm leading-6 ${
        state.success
          ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border border-red-200 bg-red-50 text-red-700"
      }`}
    >
      {state.message}
    </div>
  );
}

function FormSubmitButton({
  isPending,
  pendingLabel,
  label,
}: {
  isPending: boolean;
  pendingLabel: string;
  label: string;
}) {
  return (
    <button
      type="submit"
      disabled={isPending}
      className="inline-flex w-full items-center justify-center rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isPending ? pendingLabel : label}
    </button>
  );
}

export function AdminOrderStatusForm({
  orderId,
  currentStatus,
  currentFulfillmentStatus,
}: AdminOrderStatusFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateOrderStatusAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input
        type="hidden"
        name="orderId"
        value={orderId}
      />

      <div>
        <label
          htmlFor={`status-${orderId}`}
          className="block text-sm font-medium text-neutral-700"
        >
          Estado da encomenda
        </label>

        <select
          id={`status-${orderId}`}
          name="status"
          defaultValue={currentStatus}
          className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
        >
          <option value="pending_payment">
            A aguardar pagamento
          </option>

          <option value="paid">
            Paga
          </option>

          <option value="processing">
            Em processamento
          </option>

          <option value="sent_to_supplier">
            Enviada à Stricker
          </option>

          <option value="supplier_confirmed">
            Confirmada pela Stricker
          </option>

          <option value="in_production">
            Em produção
          </option>

          <option value="shipped">
            Expedida
          </option>

          <option value="delivered">
            Entregue
          </option>

          <option value="cancelled">
            Cancelada
          </option>

          <option value="refunded">
            Reembolsada
          </option>

          <option value="failed">
            Falhou
          </option>
        </select>
      </div>

      <div>
        <label
          htmlFor={`fulfillment-${orderId}`}
          className="block text-sm font-medium text-neutral-700"
        >
          Estado de preparação e entrega
        </label>

        <select
          id={`fulfillment-${orderId}`}
          name="fulfillmentStatus"
          defaultValue={currentFulfillmentStatus}
          className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
        >
          <option value="unfulfilled">
            Por preparar
          </option>

          <option value="partially_fulfilled">
            Parcialmente preparada
          </option>

          <option value="fulfilled">
            Preparada
          </option>

          <option value="shipped">
            Expedida
          </option>

          <option value="delivered">
            Entregue
          </option>

          <option value="cancelled">
            Cancelada
          </option>
        </select>
      </div>

      <div>
        <label
          htmlFor={`status-notes-${orderId}`}
          className="block text-sm font-medium text-neutral-700"
        >
          Observação
        </label>

        <textarea
          id={`status-notes-${orderId}`}
          name="notes"
          rows={3}
          maxLength={2000}
          placeholder="Motivo ou informação relevante sobre a alteração."
          className="mt-2 w-full resize-none rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
        />
      </div>

      <FormSubmitButton
        isPending={isPending}
        pendingLabel="A atualizar..."
        label="Atualizar estado"
      />

      <StateMessage state={state} />
    </form>
  );
}

export function AdminTrackingForm({
  orderId,
  shippingCarrier,
  trackingNumber,
  trackingUrl,
  isShipped,
}: AdminTrackingFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateOrderTrackingAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input
        type="hidden"
        name="orderId"
        value={orderId}
      />

      <div>
        <label
          htmlFor={`shipping-carrier-${orderId}`}
          className="block text-sm font-medium text-neutral-700"
        >
          Transportadora
        </label>

        <input
          id={`shipping-carrier-${orderId}`}
          name="shippingCarrier"
          type="text"
          defaultValue={shippingCarrier ?? ""}
          placeholder="Ex.: DHL, DPD, UPS ou transportadora Stricker"
          className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
        />
      </div>

      <div>
        <label
          htmlFor={`tracking-number-${orderId}`}
          className="block text-sm font-medium text-neutral-700"
        >
          Código de tracking
        </label>

        <input
          id={`tracking-number-${orderId}`}
          name="trackingNumber"
          type="text"
          defaultValue={trackingNumber ?? ""}
          placeholder="Código de acompanhamento"
          className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
        />
      </div>

      <div>
        <label
          htmlFor={`tracking-url-${orderId}`}
          className="block text-sm font-medium text-neutral-700"
        >
          URL de tracking
        </label>

        <input
          id={`tracking-url-${orderId}`}
          name="trackingUrl"
          type="url"
          defaultValue={trackingUrl ?? ""}
          placeholder="https://..."
          className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
        />
      </div>

      <label className="flex items-start gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
        <input
          type="checkbox"
          name="markAsShipped"
          value="true"
          defaultChecked={isShipped}
          className="mt-1 h-4 w-4 rounded border-neutral-300"
        />

        <span>
          <span className="block text-sm font-semibold text-neutral-950">
            Marcar como expedida
          </span>

          <span className="mt-1 block text-xs leading-5 text-neutral-500">
            Atualiza também o estado da encomenda, o estado de
            preparação e a data de expedição.
          </span>
        </span>
      </label>

      <FormSubmitButton
        isPending={isPending}
        pendingLabel="A guardar..."
        label="Guardar tracking"
      />

      <StateMessage state={state} />
    </form>
  );
}

export function AdminInvoiceForm({
  orderId,
  invoiceNumber,
  invoiceUrl,
  invoiceStatus,
}: AdminInvoiceFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateOrderInvoiceAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input
        type="hidden"
        name="orderId"
        value={orderId}
      />

      <div>
        <label
          htmlFor={`invoice-number-${orderId}`}
          className="block text-sm font-medium text-neutral-700"
        >
          Número da fatura
        </label>

        <input
          id={`invoice-number-${orderId}`}
          name="invoiceNumber"
          type="text"
          defaultValue={invoiceNumber ?? ""}
          placeholder="Ex.: FT 2026/0001"
          className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
        />
      </div>

      <div>
        <label
          htmlFor={`invoice-url-${orderId}`}
          className="block text-sm font-medium text-neutral-700"
        >
          Ligação para a fatura
        </label>

        <input
          id={`invoice-url-${orderId}`}
          name="invoiceUrl"
          type="url"
          defaultValue={invoiceUrl ?? ""}
          placeholder="https://..."
          className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
        />
      </div>

      <div>
        <label
          htmlFor={`invoice-status-${orderId}`}
          className="block text-sm font-medium text-neutral-700"
        >
          Estado da fatura
        </label>

        <select
          id={`invoice-status-${orderId}`}
          name="invoiceStatus"
          defaultValue={invoiceStatus ?? "pending"}
          className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
        >
          <option value="pending">
            Pendente
          </option>

          <option value="issued">
            Emitida
          </option>

          <option value="sent">
            Enviada ao cliente
          </option>

          <option value="cancelled">
            Cancelada
          </option>
        </select>
      </div>

      <FormSubmitButton
        isPending={isPending}
        pendingLabel="A guardar..."
        label="Guardar faturação"
      />

      <StateMessage state={state} />
    </form>
  );
}

export function AdminArtworkForm({
  orderId,
  orderItemId,
  productName,
  personalizationRequired,
  artworkStatus,
  artworkApproved,
}: AdminArtworkFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateOrderArtworkAction,
    initialState,
  );

  if (!personalizationRequired) {
    return (
      <div className="mt-5 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
        <p className="text-sm font-semibold text-neutral-950">
          Sem aprovação de arte
        </p>

        <p className="mt-1 text-xs leading-5 text-neutral-500">
          Esta linha não possui personalização associada.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-5 space-y-4">
      <input
        type="hidden"
        name="orderId"
        value={orderId}
      />

      <input
        type="hidden"
        name="orderItemId"
        value={orderItemId}
      />

      <div className="rounded-2xl bg-neutral-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
          Produto
        </p>

        <p className="mt-1 text-sm font-semibold text-neutral-950">
          {productName}
        </p>

        <p className="mt-2 text-xs text-neutral-500">
          Estado atual: {artworkStatus.replaceAll("_", " ")}
        </p>
      </div>

      <label className="flex items-start gap-3 rounded-2xl border border-neutral-200 bg-white p-4">
        <input
          type="checkbox"
          name="artworkApproved"
          value="true"
          defaultChecked={artworkApproved}
          className="mt-1 h-4 w-4 rounded border-neutral-300"
        />

        <span>
          <span className="block text-sm font-semibold text-neutral-950">
            Arte aprovada
          </span>

          <span className="mt-1 block text-xs leading-5 text-neutral-500">
            Confirma que o ficheiro e a localização estão validados
            para avançar para produção.
          </span>
        </span>
      </label>

      <div>
        <label
          htmlFor={`artwork-notes-${orderItemId}`}
          className="block text-sm font-medium text-neutral-700"
        >
          Observação
        </label>

        <textarea
          id={`artwork-notes-${orderItemId}`}
          name="notes"
          rows={3}
          maxLength={2000}
          placeholder="Informação sobre a aprovação ou sobre as correções necessárias."
          className="mt-2 w-full resize-none rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
        />
      </div>

      <FormSubmitButton
        isPending={isPending}
        pendingLabel="A atualizar..."
        label={
          artworkApproved
            ? "Atualizar aprovação"
            : "Guardar validação"
        }
      />

      <StateMessage state={state} />
    </form>
  );
}

export function AdminOrderOperations({
  orderId,
  currentStatus,
  currentFulfillmentStatus,
  shippingCarrier,
  trackingNumber,
  trackingUrl,
  isShipped,
  invoiceNumber,
  invoiceUrl,
  invoiceStatus,
}: AdminOrderStatusFormProps &
  AdminTrackingFormProps &
  AdminInvoiceFormProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <PackageCheck className="h-5 w-5 text-neutral-500" />

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
              Operação
            </p>

            <h2 className="mt-1 text-lg font-semibold text-neutral-950">
              Estado da encomenda
            </h2>
          </div>
        </div>

        <div className="mt-5">
          <AdminOrderStatusForm
            orderId={orderId}
            currentStatus={currentStatus}
            currentFulfillmentStatus={
              currentFulfillmentStatus
            }
          />
        </div>
      </section>

      <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Truck className="h-5 w-5 text-neutral-500" />

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
              Logística
            </p>

            <h2 className="mt-1 text-lg font-semibold text-neutral-950">
              Tracking e expedição
            </h2>
          </div>
        </div>

        <div className="mt-5">
          <AdminTrackingForm
            orderId={orderId}
            shippingCarrier={shippingCarrier}
            trackingNumber={trackingNumber}
            trackingUrl={trackingUrl}
            isShipped={isShipped}
          />
        </div>
      </section>

      <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <ReceiptText className="h-5 w-5 text-neutral-500" />

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
              Faturação
            </p>

            <h2 className="mt-1 text-lg font-semibold text-neutral-950">
              Dados da fatura
            </h2>
          </div>
        </div>

        <div className="mt-5">
          <AdminInvoiceForm
            orderId={orderId}
            invoiceNumber={invoiceNumber}
            invoiceUrl={invoiceUrl}
            invoiceStatus={invoiceStatus}
          />
        </div>
      </section>

      <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5">
        <div className="flex items-start gap-3">
          <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />

          <div>
            <p className="text-sm font-semibold text-blue-950">
              Submissão Stricker automática
            </p>

            <p className="mt-1 text-sm leading-6 text-blue-800">
              O estado Stricker não é alterado manualmente neste painel.
              A plataforma deve submeter automaticamente a encomenda após
              confirmar o pagamento e validar todos os requisitos técnicos.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}