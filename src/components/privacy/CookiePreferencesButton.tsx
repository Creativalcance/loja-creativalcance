"use client";

export default function CookiePreferencesButton({ label }: { label: string }) {
  return <button type="button" onClick={() => window.dispatchEvent(new Event("open-cookie-preferences"))} className="hover:text-white">{label}</button>;
}
