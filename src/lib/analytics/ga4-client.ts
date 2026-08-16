export type Ga4Item = {
  item_id?: string;
  item_name?: string;
  item_variant?: string;
  price?: number;
  quantity?: number;
};

type GtagFunction = (...args: unknown[]) => void;

type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: GtagFunction;
};

function getGtag(): GtagFunction | null {
  if (typeof window === "undefined") {
    return null;
  }

  const analyticsWindow = window as AnalyticsWindow;

  if (typeof analyticsWindow.gtag === "function") {
    return analyticsWindow.gtag;
  }

  analyticsWindow.dataLayer = analyticsWindow.dataLayer ?? [];
  analyticsWindow.gtag = (...args: unknown[]) => {
    analyticsWindow.dataLayer?.push(args);
  };

  return analyticsWindow.gtag;
}

export function trackGa4Event(
  eventName: string,
  parameters?: Record<string, unknown>,
): void {
  const gtag = getGtag();
  if (!gtag) {
    return;
  }

  gtag("event", eventName, parameters ?? {});
}
