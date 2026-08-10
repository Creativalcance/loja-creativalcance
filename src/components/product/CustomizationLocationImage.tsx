"use client";

import { useMemo, useState, type SyntheticEvent } from "react";
import { ImageIcon } from "lucide-react";

type LogoPosition = {
  x: number;
  y: number;
  width: number;
  rotation: number;
};

type DetectedPrintArea = {
  left: number;
  top: number;
  width: number;
  height: number;
  aspectRatio: number;
};

type CustomizationLocationImageProps = {
  urls: Array<string | null | undefined>;
  alt: string;
  className?: string;
  logoUrl?: string | null;
  logoPosition?: LogoPosition | null;
  logoAspectRatio?: number;
  physicalPrintAreaAspectRatio?: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
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
  logoUrl = null,
  logoPosition = null,
  logoAspectRatio = 3,
  physicalPrintAreaAspectRatio = 1,
}: CustomizationLocationImageProps) {
  const imageUrls = useMemo(() => getValidUrls(urls), [urls]);
  const imageUrlsKey = imageUrls.join("|");

  return (
    <CustomizationLocationImageContent
      key={imageUrlsKey}
      imageUrls={imageUrls}
      alt={alt}
      className={className}
      logoUrl={logoUrl}
      logoPosition={logoPosition}
      logoAspectRatio={logoAspectRatio}
      physicalPrintAreaAspectRatio={physicalPrintAreaAspectRatio}
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
  logoUrl,
  logoPosition,
  logoAspectRatio,
  physicalPrintAreaAspectRatio,
}: {
  imageUrls: string[];
  alt: string;
  className: string;
  logoUrl: string | null;
  logoPosition: LogoPosition | null;
  logoAspectRatio: number;
  physicalPrintAreaAspectRatio: number;
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

  function detectPrintArea(event: SyntheticEvent<HTMLImageElement>) {
    const image = event.currentTarget;

    if (!image.naturalWidth || !image.naturalHeight) {
      setPrintArea(null);
      return;
    }

    try {
      const scale = Math.min(
        1,
        700 / Math.max(image.naturalWidth, image.naturalHeight),
      );
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true });

      if (!context) {
        setPrintArea(null);
        return;
      }

      canvas.width = width;
      canvas.height = height;
      context.drawImage(image, 0, 0, width, height);

      const pixels = context.getImageData(0, 0, width, height).data;
      const mask = new Uint8Array(width * height);
      const rows = new Array<number>(height).fill(0);
      const columns = new Array<number>(width).fill(0);

      for (let y = Math.floor(height * 0.05); y < height * 0.95; y += 1) {
        for (let x = Math.floor(width * 0.05); x < width * 0.95; x += 1) {
          const index = (y * width + x) * 4;
          const red = pixels[index];
          const green = pixels[index + 1];
          const blue = pixels[index + 2];
          const alpha = pixels[index + 3];
          const brightness = (red + green + blue) / 3;
          const spread = Math.max(red, green, blue) - Math.min(red, green, blue);

          if (alpha < 100 || brightness < 205 || spread > 42) {
            continue;
          }

          let hasContrast = false;

          for (let offset = -5; offset <= 5 && !hasContrast; offset += 1) {
            const sampleX = clamp(x + offset, 0, width - 1);
            const sampleY = clamp(y + offset, 0, height - 1);
            const horizontalIndex = (y * width + sampleX) * 4;
            const verticalIndex = (sampleY * width + x) * 4;
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

            hasContrast =
              horizontalBrightness < brightness - 30 ||
              verticalBrightness < brightness - 30;
          }

          if (hasContrast) {
            mask[y * width + x] = 1;
            rows[y] += 1;
            columns[x] += 1;
          }
        }
      }

      const strongestRows = rows
        .map((count, coordinate) => ({ count, coordinate }))
        .filter((item) => item.count >= Math.max(4, width * 0.008))
        .sort((a, b) => b.count - a.count)
        .slice(0, 36);
      const strongestColumns = columns
        .map((count, coordinate) => ({ count, coordinate }))
        .filter((item) => item.count >= Math.max(4, height * 0.008))
        .sort((a, b) => b.count - a.count)
        .slice(0, 36);

      function edgeStats(
        start: number,
        end: number,
        fixed: number,
        horizontal: boolean,
      ) {
        let matches = 0;
        let runs = 0;
        let currentRun = 0;
        let longestRun = 0;
        const tolerance = horizontal ? 2 : Math.max(3, Math.round(width * 0.03));

        for (let cursor = start; cursor <= end; cursor += 1) {
          let found = false;

          for (let offset = -tolerance; offset <= tolerance && !found; offset += 1) {
            const x = horizontal
              ? cursor
              : clamp(fixed + offset, 0, width - 1);
            const y = horizontal
              ? clamp(fixed + offset, 0, height - 1)
              : cursor;
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

        return {
          coverage: matches / length,
          runs,
          longestRunRatio: longestRun / length,
        };
      }

      let best:
        | { left: number; top: number; right: number; bottom: number; score: number }
        | null = null;

      for (const top of strongestRows) {
        for (const bottom of strongestRows) {
          const candidateHeight = bottom.coordinate - top.coordinate;

          if (candidateHeight < height * 0.035 || candidateHeight > height * 0.5) {
            continue;
          }

          for (const left of strongestColumns) {
            for (const right of strongestColumns) {
              const candidateWidth = right.coordinate - left.coordinate;

              if (candidateWidth < width * 0.05 || candidateWidth > width * 0.7) {
                continue;
              }

              const edges = [
                edgeStats(left.coordinate, right.coordinate, top.coordinate, true),
                edgeStats(left.coordinate, right.coordinate, bottom.coordinate, true),
                edgeStats(top.coordinate, bottom.coordinate, left.coordinate, false),
                edgeStats(top.coordinate, bottom.coordinate, right.coordinate, false),
              ];
              const coverage = edges.reduce((sum, edge) => sum + edge.coverage, 0);
              const weakest = Math.min(...edges.map((edge) => edge.coverage));
              const runs = edges.reduce((sum, edge) => sum + edge.runs, 0);
              const dashed =
                edges[0].runs >= 2 &&
                edges[1].runs >= 2 &&
                edges[2].runs >= 1 &&
                edges[3].runs >= 1 &&
                edges.every((edge) => edge.longestRunRatio < 0.82);

              if (!dashed || weakest < 0.06 || coverage < 0.42) {
                continue;
              }

              const relativeArea =
                (candidateWidth * candidateHeight) / (width * height);
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

      if (!best) {
        setPrintArea(null);
        return;
      }

      const inset = Math.max(1, Math.round(Math.min(width, height) * 0.003));
      const detectedWidth = Math.max(1, best.right - best.left - inset * 2);
      const detectedHeight = Math.max(1, best.bottom - best.top - inset * 2);

      setPrintArea({
        left: ((best.left + inset) / width) * 100,
        top: ((best.top + inset) / height) * 100,
        width: (detectedWidth / width) * 100,
        height: (detectedHeight / height) * 100,
        aspectRatio: detectedWidth / detectedHeight,
      });
    } catch {
      setPrintArea(null);
    }
  }

  const physicalLogoHeight = logoPosition
    ? (logoPosition.width * physicalPrintAreaAspectRatio) /
      Math.max(0.01, logoAspectRatio)
    : 0;
  const visualLogoHeight = logoPosition
    ? (logoPosition.width * (printArea?.aspectRatio ?? physicalPrintAreaAspectRatio)) /
      Math.max(0.01, logoAspectRatio)
    : 0;
  const visualLogoTop = logoPosition
    ? clamp(
        logoPosition.y + physicalLogoHeight / 2 - visualLogoHeight / 2,
        0,
        Math.max(0, 100 - visualLogoHeight),
      )
    : 0;

  return (
    <div className="flex h-full w-full items-center justify-center p-8">
      <div className="relative inline-block max-h-full max-w-full">
        <img
          src={activeUrl}
          alt={alt}
          referrerPolicy="no-referrer"
          loading="lazy"
          className={className}
          onLoad={detectPrintArea}
          onError={() => {
            setPrintArea(null);
            setActiveIndex((currentIndex) => currentIndex + 1);
          }}
        />

        {logoUrl && logoPosition && printArea ? (
          <div
            aria-label="Área da maquete para aprovação"
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
                left: `${logoPosition.x}%`,
                top: `${visualLogoTop}%`,
                width: `${logoPosition.width}%`,
                height: `${visualLogoHeight}%`,
                transform: `rotate(${logoPosition.rotation}deg)`,
                transformOrigin: "center center",
              }}
            >
              <img
                src={logoUrl}
                alt="Logótipo aplicado na maquete"
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
