"use client";

import { useMemo, useState, type SyntheticEvent } from "react";
import { ImageIcon } from "lucide-react";

type CustomizationLocationImageProps = {
  urls: Array<string | null | undefined>;
  alt: string;
  className?: string;
  artworkUrl?: string | null;
  artworkPosition?: {
    x: number;
    y: number;
    width: number;
    rotation: number;
  };
  printAreaGeometry?: {
    left: number;
    top: number;
    width: number;
    height: number;
    origin_x: string | null;
    origin_y: string | null;
  } | null;
  printAreaAspectRatio?: number;
  artworkAspectRatio?: number;
};

type DetectedPrintArea = {
  left: number;
  top: number;
  width: number;
  height: number;
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function detectWhiteDashedArea(image: HTMLImageElement): DetectedPrintArea | null {
  if (!image.naturalWidth || !image.naturalHeight) return null;

  try {
    const maximumSize = 700;
    const scale = Math.min(
      1,
      maximumSize / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });

    if (!context) return null;

    canvas.width = width;
    canvas.height = height;
    context.drawImage(image, 0, 0, width, height);

    const pixels = context.getImageData(0, 0, width, height).data;
    const mask = new Uint8Array(width * height);
    const rowCounts = new Array<number>(height).fill(0);
    const columnCounts = new Array<number>(width).fill(0);

    for (let y = Math.floor(height * 0.05); y < height * 0.95; y += 1) {
      for (let x = Math.floor(width * 0.05); x < width * 0.95; x += 1) {
        const index = (y * width + x) * 4;
        const red = pixels[index];
        const green = pixels[index + 1];
        const blue = pixels[index + 2];
        const alpha = pixels[index + 3];
        const brightness = (red + green + blue) / 3;
        const spread = Math.max(red, green, blue) - Math.min(red, green, blue);

        if (alpha < 100 || brightness < 205 || spread > 42) continue;

        let hasDarkerNeighbour = false;

        for (let offset = -5; offset <= 5 && !hasDarkerNeighbour; offset += 1) {
          const horizontalX = clamp(x + offset, 0, width - 1);
          const verticalY = clamp(y + offset, 0, height - 1);
          const horizontalIndex = (y * width + horizontalX) * 4;
          const verticalIndex = (verticalY * width + x) * 4;
          const horizontalBrightness =
            (pixels[horizontalIndex] +
              pixels[horizontalIndex + 1] +
              pixels[horizontalIndex + 2]) /
            3;
          const verticalBrightness =
            (pixels[verticalIndex] +
              pixels[verticalIndex + 1] +
              pixels[verticalIndex + 2]) /
            3;

          hasDarkerNeighbour =
            horizontalBrightness < brightness - 30 ||
            verticalBrightness < brightness - 30;
        }

        if (!hasDarkerNeighbour) continue;

        mask[y * width + x] = 1;
        rowCounts[y] += 1;
        columnCounts[x] += 1;
      }
    }

    const rows = rowCounts
      .map((count, coordinate) => ({ count, coordinate }))
      .filter(({ count }) => count >= Math.max(4, width * 0.008))
      .sort((a, b) => b.count - a.count)
      .slice(0, 36);
    const columns = columnCounts
      .map((count, coordinate) => ({ count, coordinate }))
      .filter(({ count }) => count >= Math.max(4, height * 0.008))
      .sort((a, b) => b.count - a.count)
      .slice(0, 36);

    const edgeStats = (
      start: number,
      end: number,
      fixed: number,
      horizontal: boolean,
    ) => {
      let matches = 0;
      let runs = 0;
      let currentRun = 0;
      let longestRun = 0;
      const tolerance = horizontal ? 2 : Math.max(3, Math.round(width * 0.03));

      for (let coordinate = start; coordinate <= end; coordinate += 1) {
        let found = false;

        for (let offset = -tolerance; offset <= tolerance && !found; offset += 1) {
          const x = horizontal
            ? coordinate
            : clamp(fixed + offset, 0, width - 1);
          const y = horizontal
            ? clamp(fixed + offset, 0, height - 1)
            : coordinate;
          found = mask[y * width + x] === 1;
        }

        if (found) {
          matches += 1;
          currentRun += 1;
          longestRun = Math.max(longestRun, currentRun);
        } else if (currentRun > 0) {
          runs += 1;
          currentRun = 0;
        }
      }

      if (currentRun > 0) runs += 1;
      const length = Math.max(1, end - start + 1);

      return { coverage: matches / length, runs, longest: longestRun / length };
    };

    let best:
      | { left: number; top: number; right: number; bottom: number; score: number }
      | null = null;

    for (const top of rows) {
      for (const bottom of rows) {
        const candidateHeight = bottom.coordinate - top.coordinate;
        if (candidateHeight < height * 0.035 || candidateHeight > height * 0.5) continue;

        for (const left of columns) {
          for (const right of columns) {
            const candidateWidth = right.coordinate - left.coordinate;
            if (candidateWidth < width * 0.05 || candidateWidth > width * 0.7) continue;

            const edges = [
              edgeStats(left.coordinate, right.coordinate, top.coordinate, true),
              edgeStats(left.coordinate, right.coordinate, bottom.coordinate, true),
              edgeStats(top.coordinate, bottom.coordinate, left.coordinate, false),
              edgeStats(top.coordinate, bottom.coordinate, right.coordinate, false),
            ];
            const coverage = edges.reduce((total, edge) => total + edge.coverage, 0);
            const weakest = Math.min(...edges.map((edge) => edge.coverage));
            const dashed =
              edges[0].runs >= 2 &&
              edges[1].runs >= 2 &&
              edges[2].runs >= 1 &&
              edges[3].runs >= 1 &&
              edges.every((edge) => edge.longest < 0.82);

            if (!dashed || weakest < 0.06 || coverage < 0.42) continue;

            const relativeArea =
              (candidateWidth * candidateHeight) / (width * height);
            const runs = edges.reduce((total, edge) => total + edge.runs, 0);
            const score = coverage * 240 + weakest * 140 + relativeArea * 300 + runs;

            if (!best || score > best.score) {
              best = {
                left: left.coordinate,
                top: top.coordinate,
                right: right.coordinate,
                bottom: bottom.coordinate,
                score,
              };
            }
          }
        }
      }
    }

    if (!best) return null;

    const inset = Math.max(1, Math.round(Math.min(width, height) * 0.003));
    const left = best.left + inset;
    const top = best.top + inset;
    const right = best.right - inset;
    const bottom = best.bottom - inset;

    return {
      left: (left / width) * 100,
      top: (top / height) * 100,
      width: ((right - left) / width) * 100,
      height: ((bottom - top) / height) * 100,
    };
  } catch {
    return null;
  }
}

function resolveSupplierPrintArea(
  image: HTMLImageElement,
  geometry: NonNullable<CustomizationLocationImageProps["printAreaGeometry"]>,
): DetectedPrintArea | null {
  if (!image.naturalWidth || !image.naturalHeight) {
    return null;
  }

  const values = [geometry.left, geometry.top, geometry.width, geometry.height];

  if (values.some((value) => !Number.isFinite(value)) || geometry.width <= 0 || geometry.height <= 0) {
    return null;
  }

  const originX = geometry.origin_x?.trim().toLowerCase() ?? "left";
  const originY = geometry.origin_y?.trim().toLowerCase() ?? "top";
  const absoluteLeft = originX === "right"
    ? image.naturalWidth - geometry.left - geometry.width
    : geometry.left;
  const absoluteTop = originY === "bottom"
    ? image.naturalHeight - geometry.top - geometry.height
    : geometry.top;
  const left = (absoluteLeft / image.naturalWidth) * 100;
  const top = (absoluteTop / image.naturalHeight) * 100;
  const width = (geometry.width / image.naturalWidth) * 100;
  const height = (geometry.height / image.naturalHeight) * 100;

  if (left < -0.5 || top < -0.5 || left + width > 100.5 || top + height > 100.5) {
    return null;
  }

  return {
    left: clamp(left, 0, 100),
    top: clamp(top, 0, 100),
    width: clamp(width, 0, 100),
    height: clamp(height, 0, 100),
  };
}

function getFallbackPrintArea(
  image: HTMLImageElement,
  printAreaAspectRatio: number,
): DetectedPrintArea {
  const imageAspectRatio = image.naturalWidth / Math.max(image.naturalHeight, 1);
  const safePrintAreaAspectRatio = Math.max(printAreaAspectRatio, 0.01);
  let width = 34;
  let height = (width * imageAspectRatio) / safePrintAreaAspectRatio;

  if (height > 42) {
    height = 42;
    width = (height * safePrintAreaAspectRatio) / imageAspectRatio;
  }

  return {
    left: (100 - width) / 2,
    top: (100 - height) / 2,
    width,
    height,
  };
}

function getValidUrls(urls: Array<string | null | undefined>): string[] {
  const uniqueUrls = new Set<string>();

  urls.forEach((url) => {
    const cleanUrl = url?.trim();

    if (!cleanUrl) {
      return;
    }

    uniqueUrls.add(getBrowserSafeImageUrl(cleanUrl));
  });

  return Array.from(uniqueUrls);
}

export default function CustomizationLocationImage({
  urls,
  alt,
  className = "h-full w-full object-contain p-6",
  artworkUrl = null,
  artworkPosition,
  printAreaGeometry = null,
  printAreaAspectRatio = 1,
  artworkAspectRatio = 1,
}: CustomizationLocationImageProps) {
  const imageUrls = useMemo(() => getValidUrls(urls), [urls]);
  const imageUrlsKey = imageUrls.join("|");

  return (
    <CustomizationLocationImageContent
      key={imageUrlsKey}
      imageUrls={imageUrls}
      alt={alt}
      className={className}
      artworkUrl={artworkUrl}
      artworkPosition={artworkPosition}
      printAreaGeometry={printAreaGeometry}
      printAreaAspectRatio={printAreaAspectRatio}
      artworkAspectRatio={artworkAspectRatio}
    />
  );
}

function getBrowserSafeImageUrl(url: string): string {
  try {
    const parsed = new URL(url);

    if (parsed.hostname === "cdn.hideacontent.com") {
      return `/api/media/stricker-image?url=${encodeURIComponent(url)}`;
    }
  } catch {
    return url;
  }

  return url;
}

function CustomizationLocationImageContent({
  imageUrls,
  alt,
  className,
  artworkUrl,
  artworkPosition,
  printAreaGeometry,
  printAreaAspectRatio,
  artworkAspectRatio,
}: {
  imageUrls: string[];
  alt: string;
  className: string;
  artworkUrl: string | null;
  artworkPosition?: CustomizationLocationImageProps["artworkPosition"];
  printAreaGeometry: CustomizationLocationImageProps["printAreaGeometry"];
  printAreaAspectRatio: number;
  artworkAspectRatio: number;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [printArea, setPrintArea] = useState<DetectedPrintArea | null>(null);

  const activeUrl = imageUrls[activeIndex] ?? null;

  if (!activeUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center text-neutral-400">
        <ImageIcon className="h-8 w-8" />
      </div>
    );
  }

  const safeArtworkPosition = artworkPosition ?? {
    x: 20,
    y: 35,
    width: 60,
    rotation: 0,
  };
  const artworkHeight =
    (safeArtworkPosition.width * printAreaAspectRatio) /
    Math.max(artworkAspectRatio, 0.01);

  function handleLoad(event: SyntheticEvent<HTMLImageElement>) {
    setPrintArea(
      detectWhiteDashedArea(event.currentTarget) ??
        (printAreaGeometry
        ? resolveSupplierPrintArea(event.currentTarget, printAreaGeometry)
        : null) ??
        getFallbackPrintArea(event.currentTarget, printAreaAspectRatio),
    );
  }

  return (
    <div className="max-w-full p-8">
      <div className="relative inline-block max-w-full align-middle">
        <img
          src={activeUrl}
          alt={alt}
          referrerPolicy="no-referrer"
          loading="lazy"
          className={className.replace(/\bp-\d+\b/g, "")}
          onLoad={handleLoad}
          onError={() => {
            setPrintArea(null);
            setActiveIndex((currentIndex) => currentIndex + 1);
          }}
        />

        {artworkUrl && printArea ? (
          <div
            aria-label="Área de personalização definida pelo fornecedor"
            className="pointer-events-none absolute overflow-hidden"
            style={{
              left: `${printArea.left}%`,
              top: `${printArea.top}%`,
              width: `${printArea.width}%`,
              height: `${printArea.height}%`,
            }}
          >
            <div
              className="absolute"
              style={{
                left: `${safeArtworkPosition.x}%`,
                top: `${safeArtworkPosition.y}%`,
                width: `${safeArtworkPosition.width}%`,
                height: `${artworkHeight}%`,
                transform: `rotate(${safeArtworkPosition.rotation}deg)`,
                transformOrigin: "center center",
              }}
            >
              <img
                src={artworkUrl}
                alt="Pré-visualização da imagem carregada no produto"
                draggable={false}
                className="h-full w-full select-none object-contain"
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
