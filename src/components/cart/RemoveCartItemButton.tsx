"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import {
  removeCartItemAction,
  type RemoveCartItemActionState,
} from "@/lib/cart/actions";

type RemoveCartItemButtonProps = {
  itemId: string;
  productName: string;
  returnTo: string;
};

const initialState: RemoveCartItemActionState = {
  success: false,
  message: "",
};

export default function RemoveCartItemButton({
  itemId,
  productName,
  returnTo,
}: RemoveCartItemButtonProps) {
  const [state, formAction, isPending] = useActionState(
    removeCartItemAction,
    initialState,
  );

  return (
    <div>
      <form
        action={formAction}
        onSubmit={(event) => {
          if (
            !window.confirm(
              `Tem a certeza de que pretende remover “${productName}” do carrinho?`,
            )
          ) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="itemId" value={itemId} />
        <input type="hidden" name="returnTo" value={returnTo} />

        <button
          type="submit"
          disabled={isPending}
          aria-label={`Remover ${productName} do carrinho`}
          className="inline-flex items-center gap-2 rounded-full border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-wait disabled:opacity-60"
        >
          <Trash2 className="h-4 w-4" />
          {isPending ? "A remover..." : "Remover"}
        </button>
      </form>

      {!state.success && state.message ? (
        <p className="mt-2 max-w-56 text-xs leading-5 text-red-600" role="alert">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
