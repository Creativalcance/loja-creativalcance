"use client";

import { Trash2 } from "lucide-react";
import { deleteAdminOrderAction } from "@/app/admin/encomendas/actions";

export default function AdminDeleteOrderForm({ orderId, orderNumber }: { orderId: string; orderNumber: string }) {
  return (
    <form action={deleteAdminOrderAction} onSubmit={(event) => {
      if (!window.confirm(`Tem a certeza de que pretende eliminar a encomenda ${orderNumber}?`)) event.preventDefault();
    }}>
      <input type="hidden" name="orderId" value={orderId} />
      <button type="submit" className="inline-flex items-center justify-center rounded-2xl border border-red-300 bg-white px-5 py-3 text-sm font-semibold text-red-700 transition hover:border-red-700 hover:bg-red-50">
        <Trash2 className="mr-2 h-4 w-4" />Eliminar encomenda
      </button>
    </form>
  );
}
