"use client";

import { useState, type FormEvent } from "react";
import { uploadNewsletterHero } from "./hero-actions";

type Props = { campaignId: string; hasImage: boolean };

export default function NewsletterHeroUpload({ campaignId, hasImage }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [filename, setFilename] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const input = event.currentTarget.elements.namedItem("hero") as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) { setError("Seleciona uma imagem."); return; }
    setBusy(true);
    setError("");
    try {
      if (!file.type.startsWith("image/")) {
        throw new Error("Seleciona uma imagem JPG, PNG ou WebP.");
      }
      const bitmap = await createImageBitmap(file);
      const maxWidth = 1200;
      const scale = Math.min(1, maxWidth / bitmap.width);
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Não foi possível preparar a imagem no dispositivo.");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(bitmap, 0, 0, width, height);
      bitmap.close();
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.8));
      if (!blob || blob.type !== "image/jpeg" || blob.size > 1_500_000) {
        throw new Error("Não foi possível otimizar a imagem. Tenta uma versão mais pequena.");
      }
      const payload = new FormData();
      payload.set("campaign_id", campaignId);
      payload.set("hero", new File([blob], "newsletter-hero.jpg", { type: "image/jpeg" }));
      await uploadNewsletterHero(payload);
    } catch (reason) {
      // Redirecionamentos das Server Actions não passam por este bloco normalmente.
      const message = reason instanceof Error ? reason.message : "Não foi possível carregar a imagem.";
      setError(message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 rounded-xl border border-white/10 p-3">
      <label htmlFor={`newsletter-hero-${campaignId}`} className="block text-xs font-semibold text-white/75">
        Imagem principal (JPG, PNG ou WebP)
      </label>
      <p className="mt-1 text-xs text-white/50">O telemóvel comprime a imagem para JPG antes do carregamento.</p>
      <input id={`newsletter-hero-${campaignId}`} type="file" name="hero"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        required disabled={busy}
        onChange={(e) => { setFilename(e.target.files?.[0]?.name ?? ""); setError(""); }}
        className="mt-2 block w-full text-xs text-white/70 file:mr-2 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-white" />
      {filename && <p className="mt-2 break-all text-xs text-white/50">Selecionado: {filename}</p>}
      <button type="submit" disabled={busy}
        className="mt-3 rounded-xl bg-[#ff6a00] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">
        {busy ? "A otimizar e carregar…" : "Carregar imagem"}
      </button>
      {hasImage ? <p className="mt-2 text-xs text-emerald-300">Imagem associada à campanha</p> :
        <p className="mt-2 text-xs text-amber-300">A imagem ainda não foi carregada</p>}
      {error && <p role="alert" className="mt-2 text-xs text-red-300">{error}</p>}
    </form>
  );
}
