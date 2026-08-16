"use client";

import { useEffect } from "react";
import { trackGa4Event, type Ga4Item } from "@/lib/analytics/ga4-client";

type Ga4PurchaseTrackerProps = {
  transactionId: string;
  currency: string;
  value: number;
  items: Ga4Item[];
};

export default function Ga4PurchaseTracker({
  transactionId,
  currency,
  value,
  items,
}: Ga4PurchaseTrackerProps) {
  useEffect(() => {
    const storageKey = `ga4:purchase:${transactionId}`;

    try {
      if (localStorage.getItem(storageKey) === "1") {
        return;
      }
    } catch {
      // Analytics must never interrupt the success page.
    }

    trackGa4Event("purchase", {
      transaction_id: transactionId,
      currency,
      value,
      items,
    });

    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      // GA4 also uses transaction_id to reduce duplicate purchase reporting.
    }
  }, [currency, items, transactionId, value]);

  return null;
}
