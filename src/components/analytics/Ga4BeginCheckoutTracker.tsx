"use client";

import { useEffect } from "react";
import { trackGa4Event, type Ga4Item } from "@/lib/analytics/ga4-client";

type Ga4BeginCheckoutTrackerProps = {
  cartId: string;
  currency: string;
  value: number;
  items: Ga4Item[];
};

export default function Ga4BeginCheckoutTracker({
  cartId,
  currency,
  value,
  items,
}: Ga4BeginCheckoutTrackerProps) {
  useEffect(() => {
    const storageKey = `ga4:begin_checkout:${cartId}`;

    try {
      if (sessionStorage.getItem(storageKey) === "1") {
        return;
      }
    } catch {
      // Analytics must never interrupt checkout.
    }

    trackGa4Event("begin_checkout", {
      currency,
      value,
      items,
    });

    try {
      sessionStorage.setItem(storageKey, "1");
    } catch {
      // Analytics must never interrupt checkout.
    }
  }, [cartId, currency, items, value]);

  return null;
}
