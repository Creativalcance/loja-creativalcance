"use client";

import { useMemo, useState } from "react";
import { ImageIcon } from "lucide-react";

type CustomizationLocationImageProps = {
  urls: Array<string | null | undefined>;
  alt: string;
  className?: string;
};

function getValidUrls(urls: Array<string | null | undefined>): string[] {
  const uniqueUrls = new Set<string>();

  urls.forEach((url) => {
    const cleanUrl = url?.trim();

    if (!cleanUrl) {
      return;
    }

    uniqueUrls.add(cleanUrl);
  });

  return Array.from(uniqueUrls);
}

export default function CustomizationLocationImage({
  urls,
  alt,
  className = "h-full w-full object-contain p-6",
}: CustomizationLocationImageProps) {
  const imageUrls = useMemo(() => getValidUrls(urls), [urls]);
  const imageUrlsKey = imageUrls.join("|");

  return (
    <CustomizationLocationImageContent
      key={imageUrlsKey}
      imageUrls={imageUrls}
      alt={alt}
      className={className}
    />
  );
}

function CustomizationLocationImageContent({
  imageUrls,
  alt,
  className,
}: {
  imageUrls: string[];
  alt: string;
  className: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  const activeUrl = imageUrls[activeIndex] ?? null;

  if (!activeUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center text-neutral-400">
        <ImageIcon className="h-8 w-8" />
      </div>
    );
  }

  return (
    <img
      src={activeUrl}
      alt={alt}
      referrerPolicy="no-referrer"
      loading="lazy"
      className={className}
      onError={() => {
        setActiveIndex((currentIndex) => currentIndex + 1);
      }}
    />
  );
}
