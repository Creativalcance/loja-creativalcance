"use client";

export const CART_CHANGE_STORAGE_KEY = "360-cart-changed";
let count: number | null = null;
let refreshedAt = 0;
let requestVersion = 0;
let pending: Promise<void> | null = null;
let controller: AbortController | null = null;
let sessionOwner: string | null | undefined;
const listeners = new Set<() => void>();

export function subscribeCartCount(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export const getCartCount = () => count;
export const getServerCartCount = () => null;

export function refreshCartCount(force = false): Promise<void> {
  if (!force && pending) return pending;
  if (!force && refreshedAt && Date.now() - refreshedAt < 30000) return Promise.resolve();
  const version = ++requestVersion;
  controller?.abort();
  controller = new AbortController();
  const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]);
  pending = (async () => {
    try {
      const response = await fetch("/api/cart/count", { cache: "no-store", credentials: "same-origin", signal });
      if (!response.ok) return;
      const result = await response.json();
      if (version !== requestVersion || !Number.isSafeInteger(result.count) || result.count < 0) return;
      count = result.count;
      refreshedAt = Date.now();
      listeners.forEach(listener => listener());
    } catch {
      // Keep the last confirmed count; retry on the next navigation or focus.
    } finally {
      if (version === requestVersion) pending = null;
    }
  })();
  return pending;
}

export function syncCartCountOwner(owner: string | null) {
  if (sessionOwner === owner) return;
  const wasInitialized = sessionOwner !== undefined;
  sessionOwner = owner;
  if (!wasInitialized) return;
  count = null;
  refreshedAt = 0;
  listeners.forEach(listener => listener());
  void refreshCartCount(true);
}

export function notifyCartChanged() {
  void refreshCartCount(true);
  // Other tabs re-read their own current session. No cart contents are stored here.
  try { localStorage.setItem(CART_CHANGE_STORAGE_KEY, `${Date.now()}:${Math.random()}`); } catch { /* Storage may be blocked. */ }
}
