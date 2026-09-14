import Image from "next/image";
import CustomizationLocationImage from "@/components/product/CustomizationLocationImage";
import { hasOrderArtworkPreview, type OrderArtworkPreviewData } from "@/lib/orders/artwork-preview";

export default function OrderArtworkPreview({ preview, alt }: { preview: OrderArtworkPreviewData; alt: string }) {
  if (!hasOrderArtworkPreview(preview)) return null;
  return <div className="flex min-h-48 items-center justify-center overflow-hidden rounded-2xl bg-neutral-50" data-order-mockup>
    {preview.mockupUrl ? <Image unoptimized src={preview.mockupUrl} alt={alt} width={800} height={800} className="max-h-96 w-full object-contain p-4" /> :
      <CustomizationLocationImage urls={[preview.baseUrl]} alt={alt}
        className="block h-auto w-auto max-h-96 max-w-full object-contain"
        artworkUrl={preview.logoUrl} artworkPosition={preview.artworkPosition}
        printAreaGeometry={preview.printAreaGeometry} printAreaAspectRatio={preview.printAreaAspectRatio}
        artworkAspectRatio={preview.artworkAspectRatio} textArtwork={preview.textArtwork} />}
  </div>;
}
