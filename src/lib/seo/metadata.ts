import type { Metadata } from "next";
import {
  absoluteUrl,
  DEFAULT_SOCIAL_IMAGE,
  SITE_NAME,
} from "@/lib/seo/site";

type ProductMetadataInput = {
  name: string;
  slug: string;
  shortDescription?: string | null;
  description?: string | null;
  brand?: string | null;
  material?: string | null;
  imageUrl?: string | null;
};

function stripMarkup(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncateSeoText(value: string, maxLength = 160): string {
  const normalized = stripMarkup(value);

  if (normalized.length <= maxLength) {
    return normalized;
  }

  const slice = normalized.slice(0, Math.max(0, maxLength - 1));
  const lastSpace = slice.lastIndexOf(" ");
  const safeSlice = lastSpace >= Math.floor(maxLength * 0.65)
    ? slice.slice(0, lastSpace)
    : slice;

  return `${safeSlice.trim()}…`;
}

export function buildProductMetaDescription(
  input: ProductMetadataInput,
): string {
  const source = input.shortDescription ?? input.description;

  if (source?.trim()) {
    return truncateSeoText(source, 160);
  }

  const details = [input.brand, input.material]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  const suffix = details.length > 0 ? ` ${details.join(" · ")}.` : "";

  return truncateSeoText(
    `${input.name}.${suffix} Consulte preços por quantidade, stock e opções de personalização na ${SITE_NAME}.`,
    160,
  );
}

export function buildProductMetadata(
  input: ProductMetadataInput,
): Metadata {
  const canonicalPath = `/produto/${encodeURIComponent(input.slug)}`;
  const description = buildProductMetaDescription(input);
  const imageUrl = input.imageUrl?.trim() || DEFAULT_SOCIAL_IMAGE;

  return {
    title: input.name,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      type: "website",
      locale: "pt_PT",
      siteName: SITE_NAME,
      url: absoluteUrl(canonicalPath),
      title: input.name,
      description,
      images: [
        {
          url: imageUrl,
          alt: input.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: input.name,
      description,
      images: [imageUrl],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}
