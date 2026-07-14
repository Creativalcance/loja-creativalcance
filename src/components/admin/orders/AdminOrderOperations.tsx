"use client";

import { useActionState } from "react";
import {
  addAdminOrderNoteAction,
  updateAdminArtworkAction,
  updateAdminOrderStatusAction,
  updateAdminSupplierStatusAction,
  updateAdminTrackingAction,
  type AdminOrderActionState,
} from "@/app/admin/encomendas/[id]/actions";

type AdminOrderOperationsProps = {
  orderId: string;
  currentStatus: string;
  currentSupplierStatus: string;
  shippingCarrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
};

type AdminArtworkFormProps = {
  orderItemId: string;
  artworkStatus: string;
};

const initialState: AdminOrderActionState = {
  success: false,
  message: "",
};

function StateMessage({ state }: { state: AdminOrderActionState }) {
  if (!state.message) {
    return null;
  }

  return (
    <div
      className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
        state.success
          ? "bg-emerald-50 text-emerald-700"
          : "bg-red-50 text-red-700"
      }`}
    >
      {state.message}
    </div>
  );
}

export function AdminOrderStatusForm({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: string;
}) {
  const [state, formAction, isPending] = useActionState(
    updateAdminOrderStatusAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="orderId" value={orderId} />

      <div>
        <label
          htmlFor="status"
          className="block text-sm font-medium text-neutral-700"
        >
          Estado da encomenda
        </label>

        <select
          id="status"
          name="status"
          defaultValue={currentStatus}
          className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none focus:border-neutral-950"
        >
          <option value="pending_payment">A aguardar pagamento</option>
          <option value="paid">Paga</option>
          <option value="processing">Em validação</option>
          <option value="sent_to_supplier">Enviada ao fornecedor</option>
          <option value="supplier_confirmed">
            Confirmada pelo fornecedor
          </option>
          <option value="in_production">Em produção</option>
          <option value="shipped">Expedida</option>
          <option value="delivered">Entregue</option>
          <option value="cancelled">Cancelada</option>
          <option value="refunded">Reembolsada</option>
          <option value="failed">Falhou</option>
        </select>
      </div>

      <textarea
        name="notes"
        rows={3}
        placeholder="Nota sobre a alteração de estado"
        className="w-full resize-none rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none focus:border-neutral-950"
      />

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
      >
        {isPending ? "A atualizar..." : "Atualizar estado"}
      </button>

      <StateMessage state={state} />
    </form>
  );
}

export function AdminSupplierStatusForm({
  orderId,
  currentSupplierStatus,
}: {
  orderId: string;
  currentSupplierStatus: string;
}) {
  const [state, formAction, isPending] = useActionState(
    updateAdminSupplierStatusAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="orderId" value={orderId} />

      <div>
        <label
          htmlFor="supplierStatus"
          className="block text-sm font-medium text-neutral-700"
        >
          Estado Stricker
        </label>

        <select
          id="supplierStatus"
          name="supplierStatus"
          defaultValue={currentSupplierStatus}
          className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none focus:border-neutral-950"
        >
          <option value="not_submitted">Não submetida</option>
          <option value="ready_for_review">Pronta para revisão</option>
          <option value="approved_for_submission">
            Aprovada para submissão
          </option>
          <option value="submitting">A submeter</option>
          <option value="submitted">Submetida</option>
          <option value="partially_submitted">
            Parcialmente submetida
          </option>
          <option value="failed">Falhou</option>
          <option value="cancelled">Cancelada</option>
        </select>
      </div>

      <textarea
        name="notes"
        rows={3}
        placeholder="Nota, erro ou referência da submissão"
        className="w-full resize-none rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none focus:border-neutral-950"
      />

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
      >
        {isPending ? "A atualizar..." : "Atualizar Stricker"}
      </button>

      <StateMessage state={state} />
    </form>
  );
}

export function AdminTrackingForm({
  orderId,
  shippingCarrier,
  trackingNumber,
  trackingUrl,
}: Pick<
  AdminOrderOperationsProps,
  | "orderId"
  | "shippingCarrier"
  | "trackingNumber"
  | "trackingUrl"
>) {
  const [state, formAction, isPending] = useActionState(
    updateAdminTrackingAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="orderId" value={orderId} />

      <div>
        <label
          htmlFor="shippingCarrier"
          className="block text-sm font-medium text-neutral-700"
        >
          Transportadora
        </label>

        <input
          id="shippingCarrier"
          name="shippingCarrier"
          type="text"
          defaultValue={shippingCarrier ?? ""}
          className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none focus:border-neutral-950"
        />
      </div>

      <div>
        <label
          htmlFor="trackingNumber"
          className="block text-sm font-medium text-neutral-700"
        >
          Código de tracking
        </label>

        <input
          id="trackingNumber"
          name="trackingNumber"
          type="text"
          defaultValue={trackingNumber ?? ""}
          className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none focus:border-neutral-950"
        />
      </div>

      <div>
        <label
          htmlFor="trackingUrl"
          className="block text-sm font-medium text-neutral-700"
        >
          URL de tracking
        </label>

        <input
          id="trackingUrl"
          name="trackingUrl"
          type="url"
          defaultValue={trackingUrl ?? ""}
          placeholder="https://..."
          className="mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none focus:border-neutral-950"
        />
      </div>

      <textarea
        name="notes"
        rows={2}
        placeholder="Nota opcional"
        className="w-full resize-none rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none focus:border-neutral-950"
      />

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
      >
        {isPending ? "A guardar..." : "Guardar tracking"}
      </button>

      <StateMessage state={state} />
    </form>
  );
}

export function AdminOrderNoteForm({ orderId }: { orderId: string }) {
  const [state, formAction, isPending] = useActionState(
    addAdminOrderNoteAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="orderId" value={orderId} />

      <textarea
        name="note"
        rows={4}
        required
        maxLength={2000}
        placeholder="Adicionar nota interna à encomenda"
        className="w-full resize-none rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none focus:border-neutral-950"
      />

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
      >
        {isPending ? "A adicionar..." : "Adicionar nota"}
      </button>

      <StateMessage state={state} />
    </form>
  );
}

export function AdminArtworkForm({
  orderItemId,
  artworkStatus,
}: AdminArtworkFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateAdminArtworkAction,
    initialState,
  );

  return (
    <form action={formAction} className="mt-5 space-y-3">
      <input type="hidden" name="orderItemId" value={orderItemId} />

      <select
        name="artworkStatus"
        defaultValue={artworkStatus}
        className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none focus:border-neutral-950"
      >
        <option value="draft">Rascunho</option>
        <option value="uploaded">Ficheiro recebido</option>
        <option value="pending_review">Em revisão</option>
        <option value="approved">Aprovada</option>
        <option value="rejected">Rejeitada</option>
        <option value="changes_requested">Alterações pedidas</option>
      </select>

      <textarea
        name="notes"
        rows={2}
        placeholder="Observação sobre a validação da arte"
        className="w-full resize-none rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none focus:border-neutral-950"
      />

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-2xl border border-neutral-950 bg-white px-5 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-50 disabled:opacity-50"
      >
        {isPending ? "A atualizar..." : "Atualizar arte"}
      </button>

      <StateMessage state={state} />
    </form>
  );
}