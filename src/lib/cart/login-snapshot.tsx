"use client";

import { Fragment, useEffect, useState, type ReactNode } from "react";
import { localizePath } from "@/lib/i18n/config";

const EVENT = "360:before-login";
const MARKER = "360:shopping-resume";
type SaveEvent = CustomEvent<Promise<void>[]>;

async function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("360-shopping-resume", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("snapshots");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function save(value: unknown) {
  const db = await database();
  const key = crypto.randomUUID();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("snapshots", "readwrite");
      const snapshots = tx.objectStore("snapshots");
      const previousKey = sessionStorage.getItem(MARKER);
      if (previousKey) snapshots.delete(previousKey);
      const cursor = snapshots.openCursor();
      cursor.onsuccess = () => {
        const entry = cursor.result;
        if (!entry) return;
        if (entry.value.expires < Date.now()) entry.delete();
        entry.continue();
      };
      snapshots.put({ value, path: localizePath(location.pathname + location.search, "pt"), expires: Date.now() + 86400000 }, key);
      tx.oncomplete = () => resolve();
      tx.onerror = tx.onabort = () => reject(tx.error);
    });
    sessionStorage.setItem(MARKER, key);
  } finally { db.close(); }
}

async function restore<T>(): Promise<T | undefined> {
  const key = sessionStorage.getItem(MARKER);
  if (!key) return undefined;
  const db = await database();
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const request = db.transaction("snapshots").objectStore("snapshots").get(key);
      request.onsuccess = () => {
        const saved = request.result;
        resolve(saved?.expires > Date.now() && localizePath(saved.path, "pt") === localizePath(location.pathname + location.search, "pt") ? saved.value as T : undefined);
      };
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
}

export async function preserveShoppingBeforeNavigation() {
  const pending: Promise<void>[] = [];
  window.dispatchEvent(new CustomEvent(EVENT, { detail: pending }));
  await Promise.all(pending);
}

export const preserveShoppingBeforeLogin = preserveShoppingBeforeNavigation;

export async function snapshotImage(url: string | null): Promise<string | null> {
  if (!url || url.startsWith("data:")) return url;
  const blob = await fetch(url).then((response) => response.blob());
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function useShoppingLoginSnapshot(value: unknown) {
  useEffect(() => {
    const handler = (event: Event) => {
      (event as SaveEvent).detail.push(Promise.resolve(typeof value === "function" ? value() : value).then(save));
    };
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, [value]);
}

export function ShoppingResume<T>({ children }: { children: (snapshot: T | undefined) => ReactNode }) {
  const [state, setState] = useState<{ snapshot?: T } | null>(null);
  useEffect(() => {
    let active = true;
    void restore<T>().then((snapshot) => {
      if (!active) return;
      setState({ snapshot });
      if (snapshot) sessionStorage.removeItem(MARKER);
    }).catch(() => { if (active) setState({}); });
    return () => { active = false; };
  }, []);
  // Keep the product content in server HTML. Remount only when recovering input.
  return <Fragment key={state?.snapshot ? "recovered" : "initial"}>{children(state?.snapshot)}</Fragment>;
}
