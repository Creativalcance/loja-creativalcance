"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import Image from "next/image";
import { manageManualProductAction } from "@/app/admin/produtos/actions";
import { uploadManualProductPhoto } from "@/app/admin/produtos/photo-actions";
import {
  isProductPhotoUrl, MAX_PHOTO_BYTES, MAX_PRODUCT_PHOTOS,
  type ProductPhotoSelection, type SavedProductPhoto,
} from "@/lib/manual-products/photos";

type Photo = SavedProductPhoto & { saved?: boolean; file?: File; uploaded?: string };

export default function PhotoEditForm({ children, initialPhotos }: {
  children: ReactNode;
  initialPhotos: SavedProductPhoto[];
}) {
  const [photos, setPhotos] = useState<Photo[]>(() => initialPhotos.map(photo => ({ ...photo, saved: true })));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [, startTransition] = useTransition();
  const submitting = useRef(false);
  const previews = useRef(new Set<string>());
  const urlInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const urls = previews.current;
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, []);

  async function submit(formData: FormData) {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true); setError("");
    try {
      const selection: ProductPhotoSelection[] = [];
      for (const [index, photo] of photos.entries()) {
        if (photo.saved) { selection.push({ id: photo.id }); continue; }
        if (!photo.file) { selection.push({ externalUrl: photo.url }); continue; }
        let url = photo.uploaded;
        if (!url) {
          setMessage(`A carregar fotografia ${index + 1} de ${photos.length}…`);
          const upload = new FormData(); upload.set("photo", photo.file);
          const result = await uploadManualProductPhoto(upload);
          if (!result.url) throw new Error(result.error || "Falhou o carregamento da fotografia.");
          url = result.url;
          // Keep successful uploads for a retry if another upload or validation fails.
          setPhotos(current => current.map(item => item.id === photo.id ? { ...item, uploaded: url } : item));
        }
        selection.push({ url });
      }
      formData.set("photos", JSON.stringify(selection));
      setMessage("A guardar alterações…");
      const result = await manageManualProductAction({ success: false, message: "" }, formData);
      if (!result.success) throw new Error(result.message);
      setMessage("Alterações guardadas.");
    } catch (cause) {
      setMessage("");
      setError(cause instanceof Error ? cause.message : "Não foi possível guardar. Tenta novamente.");
    } finally {
      submitting.current = false; setBusy(false);
    }
  }

  return (
    <form onSubmit={event => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      startTransition(() => submit(data));
    }} className="min-w-0 rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-6">
      <fieldset disabled={busy} className="min-w-0 space-y-6 disabled:opacity-60">
        {children}
        <section aria-labelledby="edit-photos-heading">
          <h2 id="edit-photos-heading" className="text-lg font-semibold">Fotografias do produto</h2>
          <p id="edit-photos-help" className="mt-2 text-sm text-neutral-600">
            Até 10 fotografias JPG, PNG ou WebP, com um máximo de 3 MB cada.
            Escolhe a fotografia de destaque para a loja. As alterações são aplicadas ao guardar.
          </p>
          <label className="mt-4 block text-sm font-semibold">
            Carregar fotografias
            <input type="file" multiple accept="image/jpeg,image/png,image/webp"
              aria-describedby="edit-photos-help" className="mt-2 block w-full min-w-0 rounded-xl border p-3 text-sm"
              onChange={event => {
                const files = Array.from(event.target.files ?? []); event.target.value = "";
                if (photos.length + files.length > MAX_PRODUCT_PHOTOS) { setError("Podes selecionar até 10 fotografias."); return; }
                if (files.some(file => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || !file.size || file.size > MAX_PHOTO_BYTES)) {
                  setError("Seleciona fotografias JPG, PNG ou WebP até 3 MB cada."); return;
                }
                setError(""); setMessage("");
                const added = files.map(file => {
                  const url = URL.createObjectURL(file); previews.current.add(url);
                  return { id: crypto.randomUUID(), file, url, label: file.name };
                });
                setPhotos(current => [...current, ...added]);
              }} />
          </label>
          <p className="mt-3 text-xs text-neutral-500">{photos.length} de {MAX_PRODUCT_PHOTOS} fotografias</p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((photo, index) => (
              <article key={photo.id} className={`min-w-0 rounded-xl border p-2 ${index === 0 ? "border-orange-500 bg-orange-50" : "border-neutral-200"}`}>
                {photo.url && <Image src={photo.url} alt={photo.label} width={200} height={200} unoptimized className="aspect-square w-full rounded-lg bg-white object-contain" />}
                <p className="mt-2 truncate text-xs" title={photo.label}>{photo.label}</p>
                <button type="button" aria-pressed={index === 0}
                  aria-label={`Definir fotografia ${index + 1} como destaque`}
                  className="mt-2 min-h-11 text-left text-sm font-semibold text-orange-800 underline"
                  onClick={() => setPhotos(current => [photo, ...current.filter(item => item.id !== photo.id)])}>
                  {index === 0 ? "Fotografia de destaque" : "Definir como destaque"}
                </button>
                <button type="button" className="block min-h-11 text-sm text-red-700 underline"
                  aria-label={`Remover fotografia ${index + 1}`} onClick={() => {
                    if (previews.current.delete(photo.url)) URL.revokeObjectURL(photo.url);
                    setPhotos(current => current.filter(item => item.id !== photo.id));
                  }}>Remover</button>
              </article>
            ))}
          </div>
          <details className="mt-4 text-sm">
            <summary className="cursor-pointer font-medium">Adicionar imagem por URL</summary>
            <label className="mt-3 block">URL da imagem
              <input ref={urlInput} type="url" placeholder="https://..." className="mt-2 w-full rounded-xl border p-3" />
            </label>
            <button type="button" className="mt-3 rounded-xl border px-4 py-2 font-semibold" onClick={() => {
              const url = urlInput.current?.value.trim() ?? "";
              if (!isProductPhotoUrl(url)) { setError("Indica um URL HTTP ou HTTPS válido para a imagem."); return; }
              if (photos.length >= MAX_PRODUCT_PHOTOS) { setError("Podes selecionar até 10 fotografias."); return; }
              if (photos.some(photo => photo.url === url)) { setError("Esta fotografia já está na galeria."); return; }
              setPhotos(current => [...current, { id: crypto.randomUUID(), url, label: "Imagem por URL" }]);
              if (urlInput.current) urlInput.current.value = "";
              setError("");
            }}>Adicionar à galeria</button>
          </details>
        </section>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <p role="status" aria-live="polite" className="text-sm text-neutral-600">{message}</p>
        <button type="submit" className="rounded-xl bg-[#162334] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-wait">
          {busy ? "A guardar…" : "Guardar alterações"}
        </button>
      </fieldset>
    </form>
  );
}
