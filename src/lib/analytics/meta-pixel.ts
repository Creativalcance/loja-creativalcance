export const META_PIXEL_ID = "1622422235741386";
const SCRIPT_URL = "https://connect.facebook.net/en_US/fbevents.js";

type PixelFunction = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[][];
  push?: PixelFunction;
  loaded?: boolean;
  version?: string;
};

type PixelWindow = Window & { fbq?: PixelFunction; _fbq?: PixelFunction };
let loading = false;
let initialized = false;
let consentGranted = false;
let currentPath = "";
let pageViewSent = false;

function clearPixelCookies() {
  const parts = window.location.hostname.split(".");
  const domains = [""];
  for (let index = 0; index < parts.length - 1; index++) {
    domains.push(`; Domain=${parts.slice(index).join(".")}`);
  }
  for (const name of ["_fbp", "_fbc"]) {
    for (const domain of domains) {
      document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax; Secure${domain}`;
    }
  }
}

export function revokeMetaPixelConsent() {
  if (typeof window === "undefined") return;
  consentGranted = false;
  try {
    (window as PixelWindow).fbq?.("consent", "revoke");
  } catch {
    // A third-party SDK error must not block a visitor's privacy choice.
  } finally {
    clearPixelCookies();
  }
}

function sendPageView() {
  const fbq = (window as PixelWindow).fbq;
  if (!consentGranted || !fbq?.callMethod) return;
  try {
    if (!initialized) {
      // Keep this integration limited to the requested PageView event.
      fbq("set", "autoConfig", false, META_PIXEL_ID);
      fbq("init", META_PIXEL_ID);
      initialized = true;
    }
    fbq("consent", "grant");
    if (!pageViewSent) {
      fbq("trackSingle", META_PIXEL_ID, "PageView");
      pageViewSent = true;
    }
  } catch {
    // Advertising must never interrupt browsing or checkout.
  }
}

function loadPixel() {
  const pixelWindow = window as PixelWindow;
  if (pixelWindow.fbq?.callMethod) {
    sendPageView();
    return;
  }
  if (loading) return;
  if (!pixelWindow.fbq) {
    const fbq: PixelFunction = (...args) => {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue?.push(args);
    };
    fbq.queue = [];
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    pixelWindow.fbq = fbq;
    pixelWindow._fbq = pixelWindow._fbq || fbq;
  }
  // Do not queue visits: consent may be withdrawn while the SDK is loading.
  pixelWindow.fbq("consent", "revoke");
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_URL}"]`);
  const script = existing || document.createElement("script");
  loading = true;
  script.addEventListener("load", () => {
    loading = false;
    sendPageView();
  }, { once: true });
  script.addEventListener("error", () => {
    loading = false;
    script.remove();
  }, { once: true });
  if (!existing) {
    script.id = "meta-pixel-sdk";
    script.async = true;
    script.src = SCRIPT_URL;
    document.head.appendChild(script);
  }
}

export function updateMetaPixel(marketingConsent: boolean, pathname: string) {
  if (typeof window === "undefined") return;
  if (pathname !== currentPath) {
    currentPath = pathname;
    pageViewSent = false;
  }
  const publicPath = pathname.replace(/^\/(?:en|fr|es|de|it)(?=\/|$)/, "") || "/";
  const privatePage = /^\/(?:admin|area-cliente|area-comercial|auth|api|login|registo|nova-password|recuperar-password)(?:\/|$)/.test(publicPath);
  if (!marketingConsent || privatePage || !pathname) {
    revokeMetaPixelConsent();
    return;
  }
  consentGranted = true;
  loadPixel();
}
