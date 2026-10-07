"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent, type TouchEvent } from "react";
import { canOptimizeCatalogImage } from "@/lib/catalog/image-optimization";
import { selectGalleryImages, type ProductGalleryImage } from "@/lib/catalog/product-gallery";
import type { SiteLocale } from "@/lib/i18n/config";

const messages = {
  pt: { gallery: "Fotografias do produto", previous: "Fotografia anterior", next: "Fotografia seguinte", enlarge: "Ampliar fotografia", close: "Fechar ampliação", image: "Fotografia", unavailable: "Imagem indisponível", example: "Exemplo de personalização", all: "Ver todas as cores", selected: "Ver a cor selecionada" },
  en: { gallery: "Product photos", previous: "Previous photo", next: "Next photo", enlarge: "Enlarge photo", close: "Close enlarged photo", image: "Photo", unavailable: "Image unavailable", example: "Personalization example", all: "View all colours", selected: "View selected colour" },
  fr: { gallery: "Photos du produit", previous: "Photo précédente", next: "Photo suivante", enlarge: "Agrandir la photo", close: "Fermer l’agrandissement", image: "Photo", unavailable: "Image indisponible", example: "Exemple de personnalisation", all: "Voir toutes les couleurs", selected: "Voir la couleur sélectionnée" },
  es: { gallery: "Fotografías del producto", previous: "Fotografía anterior", next: "Fotografía siguiente", enlarge: "Ampliar fotografía", close: "Cerrar ampliación", image: "Fotografía", unavailable: "Imagen no disponible", example: "Ejemplo de personalización", all: "Ver todos los colores", selected: "Ver el color seleccionado" },
  de: { gallery: "Produktfotos", previous: "Vorheriges Foto", next: "Nächstes Foto", enlarge: "Foto vergrößern", close: "Vergrößerung schließen", image: "Foto", unavailable: "Bild nicht verfügbar", example: "Personalisierungsbeispiel", all: "Alle Farben ansehen", selected: "Ausgewählte Farbe ansehen" },
  it: { gallery: "Fotografie del prodotto", previous: "Fotografia precedente", next: "Fotografia successiva", enlarge: "Ingrandisci fotografia", close: "Chiudi ingrandimento", image: "Fotografia", unavailable: "Immagine non disponibile", example: "Esempio di personalizzazione", all: "Vedi tutti i colori", selected: "Vedi il colore selezionato" },
} satisfies Record<SiteLocale, Record<string, string>>;

function GalleryPhoto({ image, alt, mode, unavailable, onUnavailable }: {
  image: ProductGalleryImage;
  alt: string;
  mode: "main" | "thumbnail" | "zoom";
  unavailable: string;
  onUnavailable?: () => void;
}) {
  const [failed, setFailed] = useState<string[]>([]);
  const [direct, setDirect] = useState(false);
  const sources = mode === "zoom" ? [image.zoomUrl, image.url, image.thumbnailUrl]
    : mode === "thumbnail" ? [image.thumbnailUrl, image.url] : [image.url, image.thumbnailUrl];
  const source = sources.find(url => !failed.includes(url));
  if (!source) return <span className="p-3 text-xs text-neutral-500">{unavailable}</span>;
  const optimized = !direct && canOptimizeCatalogImage(source);
  return (
    <Image
      src={source}
      alt={alt}
      width={mode === "thumbnail" ? 80 : 1000}
      height={mode === "thumbnail" ? 80 : 1000}
      sizes={mode === "thumbnail" ? "80px" : mode === "zoom" ? "90vw" : "(max-width: 1023px) 90vw, 640px"}
      unoptimized={!optimized}
      loading={mode === "thumbnail" ? "lazy" : "eager"}
      draggable={false}
      className={mode === "thumbnail" ? "h-full w-full object-contain p-1" : "h-full w-full object-contain p-4 sm:p-8"}
      onError={() => {
        // An optimizer error should not hide an otherwise available original photo.
        if (optimized) { setDirect(true); return; }
        const nextFailed = [...failed, source];
        setFailed(nextFailed);
        setDirect(false);
        if (!sources.some(url => !nextFailed.includes(url))) onUnavailable?.();
      }}
    />
  );
}

type ProductGalleryProps = {
  images: ProductGalleryImage[];
  selectedColorKey: string | null;
  preferredImageUrl: string | null;
  productName: string;
  locale: SiteLocale;
};

export default function ProductGallery({ images, selectedColorKey, preferredImageUrl, productName, locale }: ProductGalleryProps) {
  const text = messages[locale];
  const [showAll, setShowAll] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [unavailableIds, setUnavailableIds] = useState<string[]>([]);
  const [zoomOpen, setZoomOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const visible = selectGalleryImages(images, selectedColorKey, preferredImageUrl, showAll)
    .filter(image => !unavailableIds.includes(image.id));
  const index = Math.max(0, visible.findIndex(image => image.id === selectedId));
  const current = visible[index];
  const hasOtherColors = !!selectedColorKey && images.some(image => image.colorKeys.length && !image.colorKeys.includes(selectedColorKey));
  // A bounded thumbnail strip avoids downloading dozens of colour/size photos at once.
  const thumbnailStart = Math.floor(index / 6) * 6;
  const thumbnails = visible.slice(thumbnailStart, thumbnailStart + 6);

  useEffect(() => {
    const element = dialog.current;
    if (!zoomOpen || !element) return;
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [zoomOpen]);

  function move(delta: number) {
    if (visible.length > 1) setSelectedId(visible[(index + delta + visible.length) % visible.length].id);
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      move(event.key === "ArrowLeft" ? -1 : 1);
    }
  }

  function onTouchStart(event: TouchEvent<HTMLElement>) {
    swiped.current = false;
    const point = event.touches[0];
    touchStart.current = event.touches.length === 1 ? { x: point.clientX, y: point.clientY } : null;
  }

  function onTouchEnd(event: TouchEvent<HTMLElement>) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || !event.changedTouches[0]) return;
    const dx = event.changedTouches[0].clientX - start.x;
    const dy = event.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      swiped.current = true;
      move(dx > 0 ? -1 : 1);
    }
  }

  const photoAlt = `${productName} — ${text.image} ${index + 1}${current?.personalizationExample ? ` — ${text.example}` : ""}`;
  const buttonClass = "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-800 transition hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950";

  return (
    <section aria-label={text.gallery} data-product-gallery onKeyDown={onKeyDown}>
      <div className="relative mx-auto flex aspect-[4/3] max-h-[560px] items-center justify-center overflow-hidden rounded-3xl bg-neutral-50">
        {current ? (
          <button type="button" className="h-full w-full cursor-zoom-in touch-pan-y focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-neutral-950"
            aria-label={text.enlarge} aria-haspopup="dialog" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
            onTouchCancel={() => { touchStart.current = null; }}
            onClick={() => { if (!swiped.current) setZoomOpen(true); swiped.current = false; }}>
            <GalleryPhoto key={current.id} image={current} alt={photoAlt} mode="main" unavailable={text.unavailable}
              onUnavailable={() => setUnavailableIds(ids => [...ids, current.id])} />
            <span aria-hidden="true" className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-neutral-600"><Expand className="h-4 w-4" /></span>
          </button>
        ) : <p className="text-sm text-neutral-500">{text.unavailable}</p>}
        {current?.personalizationExample && <span className="pointer-events-none absolute bottom-3 left-3 right-3 rounded-lg bg-white/95 px-3 py-2 text-center text-xs text-neutral-700">{text.example}</span>}
      </div>

      {visible.length > 1 && (
        <div className="mt-3 flex items-center justify-between gap-3">
          <button type="button" className={buttonClass} aria-label={text.previous} onClick={() => move(-1)}><ChevronLeft className="h-5 w-5" /></button>
          <p className="text-sm tabular-nums text-neutral-600" aria-live="polite" aria-atomic="true">{text.image} {index + 1} / {visible.length}</p>
          <button type="button" className={buttonClass} aria-label={text.next} onClick={() => move(1)}><ChevronRight className="h-5 w-5" /></button>
        </div>
      )}

      {visible.length > 1 && (
        <div className="mt-3 grid grid-cols-6 gap-1.5 sm:gap-2">
          {thumbnails.map((image, offset) => (
            <button key={image.id} type="button" aria-label={`${text.image} ${thumbnailStart + offset + 1}${image.personalizationExample ? ` — ${text.example}` : ""}`}
              aria-pressed={image.id === current?.id} onClick={() => setSelectedId(image.id)}
              className={`aspect-square min-w-0 overflow-hidden rounded-lg border-2 bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 ${image.id === current?.id ? "border-neutral-950" : "border-neutral-200 hover:border-neutral-400"}`}>
              <GalleryPhoto image={image} alt="" mode="thumbnail" unavailable={text.unavailable} />
            </button>
          ))}
        </div>
      )}

      {hasOtherColors && <button type="button" className="mt-3 min-h-11 text-sm font-medium text-neutral-600 underline underline-offset-4 hover:text-neutral-950"
        aria-pressed={showAll} onClick={() => { setShowAll(!showAll); setSelectedId(null); }}>{showAll ? text.selected : text.all}</button>}

      <dialog ref={dialog} aria-label={`${text.gallery} — ${productName}`} onCancel={() => setZoomOpen(false)} onClose={() => setZoomOpen(false)}
        className="fixed inset-0 m-auto max-h-[95dvh] w-[min(96vw,1200px)] max-w-none rounded-2xl border-0 bg-white p-3 shadow-2xl backdrop:bg-black/70 sm:p-5">
        {zoomOpen && (
          <>
            <div className="flex items-center justify-between gap-4">
              <p className="truncate text-sm font-medium text-neutral-800">{productName}</p>
              <button type="button" autoFocus className={buttonClass} aria-label={text.close} onClick={() => setZoomOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-2 flex h-[65dvh] items-center justify-center" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
              {current ? <GalleryPhoto key={`${current.id}:zoom`} image={current} alt={photoAlt} mode="zoom" unavailable={text.unavailable} /> : <p>{text.unavailable}</p>}
            </div>
            {current?.personalizationExample && <p className="text-center text-sm text-neutral-600">{text.example}</p>}
            {visible.length > 1 && <div className="mt-2 flex items-center justify-between gap-3">
              <button type="button" className={buttonClass} aria-label={text.previous} onClick={() => move(-1)}><ChevronLeft className="h-5 w-5" /></button>
              <p className="text-sm tabular-nums text-neutral-600" aria-live="polite">{text.image} {index + 1} / {visible.length}</p>
              <button type="button" className={buttonClass} aria-label={text.next} onClick={() => move(1)}><ChevronRight className="h-5 w-5" /></button>
            </div>}
          </>
        )}
      </dialog>
    </section>
  );
}
