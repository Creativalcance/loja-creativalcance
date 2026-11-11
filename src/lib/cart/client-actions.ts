"use client";

import { addToCartAction, removeCartItemAction, type AddToCartActionState, type RemoveCartItemActionState } from "./actions";
import { notifyCartChanged } from "./count-store";

export async function addToCartWithFeedback(state: AddToCartActionState, data: FormData) {
  const result = await addToCartAction(state, data);
  if (result.success) notifyCartChanged();
  return result;
}

export async function removeCartItemWithFeedback(state: RemoveCartItemActionState, data: FormData) {
  try {
    return await removeCartItemAction(state, data);
  } finally {
    // Successful removals redirect, so refresh even when the action does not return.
    notifyCartChanged();
  }
}
