"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import Image from "next/image";
import { createManualProductAction } from "../actions";
import { uploadManualProductPhoto } from "../photo-actions";
import { MAX_PHOTO_BYTES, MAX_PRODUCT_PHOTOS } from "@/lib/manual-products/photos";

type Photo = { id: string; file: File; preview: string; uploaded?: string };
export default function ProductCreationForm({ children }: { children: ReactNode }) {
  const [, startTransition] = useTransition();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const previews = useRef(new Set<string>());
  const submitting = useRef(false);
  useEffect(() => {
    const urls = previews.current;
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, []);

  async function submit(formData: FormData) {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true); setError("");
    try {
      const urls: string[] = [];
      for (const [index, photo] of photos.entries()) {
        setMessage(`A carregar fotografia ${index + 1} de ${photos.length}…`);
        let url = photo.uploaded;
        if (!url) {
          const upload = new FormData(); upload.set("photo", photo.file);
          const result = await uploadManualProductPhoto(upload);
          if (!result.url) throw new Error(result.error || "Falhou o carregamento da fotografia.");
          url = result.url;
          setPhotos(current => current.map(item => item.id === photo.id ? { ...item, uploaded: url } : item));
        }
        urls.push(url);
      }
      formData.set("imageUrls", JSON.stringify(urls));
      setMessage("A guardar produto…");
      await createManualProductAction(formData);
    } catch (cause) {
      // Preserve Next's successful redirect; only display actual action failures.
      if (cause instanceof Error && cause.message === "NEXT_REDIRECT") throw cause;
      setError(cause instanceof Error ? cause.message : "Não foi possível guardar. Tenta novamente.");
    } finally {
      submitting.current = false; setBusy(false); setMessage("");
    }
  }

  return <form onSubmit={event => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => submit(formData));
  }} className="mt-8 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
    <fieldset disabled={busy} className="grid min-w-0 gap-6 md:grid-cols-2">
      {children}
      <section className="md:col-span-2" aria-labelledby="photos-heading">
        <h2 id="photos-heading" className="text-lg font-semibold">Fotografias do produto</h2>
        <p id="photos-help" className="mt-2 text-sm text-neutral-600">Até 10 fotografias JPG, PNG ou WebP, com um máximo de 3 MB cada. A primeira será a imagem principal. São carregadas ao criar o produto.</p>
        <label className="mt-4 block text-sm font-semibold">Escolher fotografias
          <input type="file" multiple accept="image/jpeg,image/png,image/webp" aria-describedby="photos-help" className="mt-2 block w-full rounded-xl border p-3" onChange={event => {
            const files = Array.from(event.target.files ?? []); event.target.value = "";
            if (photos.length + files.length > MAX_PRODUCT_PHOTOS) { setError("Podes selecionar até 10 fotografias."); return; }
            if (files.some(file => !["image/jpeg","image/png","image/webp"].includes(file.type) || !file.size || file.size > MAX_PHOTO_BYTES)) {
              setError("Seleciona fotografias JPG, PNG ou WebP até 3 MB cada."); return;
            }
            setError("");
            setPhotos(current => [...current, ...files.map(file => {
              const preview = URL.createObjectURL(file); previews.current.add(preview);
              return { id: crypto.randomUUID(), file, preview };
            })]);
          }} />
        </label>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {photos.map((photo, index) => <article key={photo.id} className="rounded-xl border p-2">
            <Image src={photo.preview} alt={`Pré-visualização de ${photo.file.name}`} width={200} height={200} unoptimized className="aspect-square w-full rounded-lg object-contain" />
            <p className="mt-2 truncate text-xs" title={photo.file.name}>{photo.file.name}</p>
            {index === 0 ? <p className="mt-2 text-sm font-semibold text-orange-700">Principal</p> : <button type="button" className="mt-2 text-sm underline" onClick={() => setPhotos(current => [photo, ...current.filter(item => item.id !== photo.id)])}>Definir como principal</button>}
            <button type="button" className="mt-2 block text-sm text-red-700 underline" aria-label={`Remover ${photo.file.name}`} onClick={() => {
              URL.revokeObjectURL(photo.preview); previews.current.delete(photo.preview);
              setPhotos(current => current.filter(item => item.id !== photo.id));
            }}>Remover</button>
          </article>)}
        </div>
      </section>
      <div className="md:col-span-2">
        {error ? <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
        <p role="status" aria-live="polite" className="mb-3 text-sm text-neutral-600">{message}</p>
        <button type="submit" className="rounded-2xl bg-orange-600 px-6 py-3 font-semibold text-white disabled:opacity-50">{busy ? "A guardar…" : "Criar produto"}</button>
      </div>
    </fieldset>
  </form>;
}
