"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ImageIcon,
  Move,
  Palette,
  RotateCcw,
  Ruler,
  Upload,
} from "lucide-react";

export type ProductSimulatorVariant = {
  id: string;
  sku: string;
  color_name: string | null;
  color_hex: string | null;
  size: string | null;
  image_url: string | null;
};

export type ProductSimulatorLocation = {
  id: string;
  variant_id: string | null;
  component_name: string | null;
  location_name: string | null;
  image_url: string | null;
  max_printing_area_mm: string | null;
  max_area_cm2: number | null;
  table_codes: string[];
  customization_types: string[];
  is_default: boolean;
};

type LogoPosition = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

type ProductCustomizationSimulatorProps = {
  productName: string;
  productSku: string;
  productImageUrl: string | null;
  variants: ProductSimulatorVariant[];
  locations: ProductSimulatorLocation[];
};

const initialPosition: LogoPosition = {
  x: 50,
  y: 50,
  scale: 34,
  rotation: 0,
};

function getColorLabel(variant: ProductSimulatorVariant): string {
  if (variant.color_name && variant.size) {
    return `${variant.color_name} · ${variant.size}`;
  }

  return variant.color_name ?? variant.size ?? variant.sku;
}

function getLocationLabel(location: ProductSimulatorLocation): string {
  return (
    location.location_name ??
    location.component_name ??
    location.max_printing_area_mm ??
    "Área de personalização"
  );
}

function getAvailableLocations(params: {
  selectedVariantId: string | null;
  locations: ProductSimulatorLocation[];
}): ProductSimulatorLocation[] {
  const colorLocations = params.locations.filter(
    (location) => location.variant_id === params.selectedVariantId,
  );

  if (colorLocations.length > 0) {
    return colorLocations;
  }

  return params.locations;
}

export default function ProductCustomizationSimulator({
  productName,
  productSku,
  productImageUrl,
  variants,
  locations,
}: ProductCustomizationSimulatorProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    variants[0]?.id ?? null,
  );

  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    locations.find((location) => location.is_default)?.id ??
      locations[0]?.id ??
      null,
  );

  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoFileName, setLogoFileName] = useState<string | null>(null);
  const [position, setPosition] = useState<LogoPosition>(initialPosition);

  const selectedColor = useMemo(
    () =>
      variants.find((variant) => variant.id === selectedVariantId) ??
      variants[0] ??
      null,
    [selectedVariantId, variants],
  );

  const availableLocations = useMemo(
    () =>
      getAvailableLocations({
        selectedVariantId,
        locations,
      }),
    [selectedVariantId, locations],
  );

  const selectedLocation = useMemo(
    () =>
      availableLocations.find(
        (location) => location.id === selectedLocationId,
      ) ??
      availableLocations.find((location) => location.is_default) ??
      availableLocations[0] ??
      null,
    [availableLocations, selectedLocationId],
  );

  const previewBaseImage =
    selectedColor?.image_url ?? selectedLocation?.image_url ?? productImageUrl;

  useEffect(() => {
    if (
      selectedLocationId &&
      availableLocations.some((location) => location.id === selectedLocationId)
    ) {
      return;
    }

    setSelectedLocationId(
      availableLocations.find((location) => location.is_default)?.id ??
        availableLocations[0]?.id ??
        null,
    );
  }, [availableLocations, selectedLocationId]);

  useEffect(() => {
    return () => {
      if (logoPreviewUrl) {
        URL.revokeObjectURL(logoPreviewUrl);
      }
    };
  }, [logoPreviewUrl]);

  function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      return;
    }

    if (logoPreviewUrl) {
      URL.revokeObjectURL(logoPreviewUrl);
    }

    setLogoPreviewUrl(URL.createObjectURL(file));
    setLogoFileName(file.name);
  }

  function updatePosition(key: keyof LogoPosition, value: number) {
    setPosition((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetPosition() {
    setPosition(initialPosition);
  }

  if (locations.length === 0) {
    return (
      <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
          Personalização
        </p>

        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950">
          Cria a tua maquete
        </h2>

        <div className="mt-6 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-6 text-sm leading-6 text-neutral-600">
          Este produto pode ser analisado pela nossa equipa para personalização.
          Envia-nos o teu pedido e confirmamos a melhor solução para a tua marca.
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
            Personalização
          </p>

          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950">
            Cria a tua maquete
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">
            Escolhe a cor do produto, selecciona a área de personalização e
            carrega o teu logótipo para visualizar uma primeira maquete.
          </p>
        </div>

        <div className="rounded-2xl bg-neutral-950 px-4 py-3 text-sm font-semibold text-white">
          {locations.length} áreas disponíveis
        </div>
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
          <div className="relative mx-auto aspect-[4/3] max-h-[560px] overflow-hidden rounded-2xl bg-white">
            {previewBaseImage ? (
              <img
                src={previewBaseImage}
                alt={productName}
                className="h-full w-full object-contain p-8"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-neutral-400">
                <ImageIcon className="h-10 w-10" />
              </div>
            )}

            <div
              className="pointer-events-none absolute rounded-xl border-2 border-dashed border-neutral-950/40 bg-white/60 backdrop-blur-[1px]"
              style={{
                left: `${position.x}%`,
                top: `${position.y}%`,
                width: `${position.scale}%`,
                height: `${position.scale * 0.42}%`,
                transform: `translate(-50%, -50%) rotate(${position.rotation}deg)`,
              }}
            >
              {logoPreviewUrl ? (
                <img
                  src={logoPreviewUrl}
                  alt="Logótipo carregado"
                  className="h-full w-full object-contain p-2"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center px-3 text-center text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                  Logótipo
                </div>
              )}
            </div>
          </div>

          {variants.length > 0 ? (
            <div className="mt-5 rounded-2xl bg-white p-4 ring-1 ring-neutral-200">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-neutral-500" />
                <p className="text-sm font-semibold text-neutral-950">
                  Cores disponíveis
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {variants.map((variant) => {
                  const isSelected = variant.id === selectedVariantId;

                  return (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => {
                        setSelectedVariantId(variant.id);
                      }}
                      className={`inline-flex items-center rounded-full border px-3 py-2 text-sm font-medium transition ${
                        isSelected
                          ? "border-neutral-950 bg-neutral-950 text-white"
                          : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"
                      }`}
                      title={getColorLabel(variant)}
                    >
                      {variant.color_hex ? (
                        <span
                          className="mr-2 h-4 w-4 rounded-full border border-neutral-300"
                          style={{ backgroundColor: variant.color_hex }}
                        />
                      ) : null}

                      {getColorLabel(variant)}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 text-sm text-neutral-600 md:grid-cols-3">
            <div className="rounded-2xl bg-white p-4 ring-1 ring-neutral-200">
              <p className="font-semibold text-neutral-950">Referência</p>
              <p className="mt-1">{productSku}</p>
            </div>

            <div className="rounded-2xl bg-white p-4 ring-1 ring-neutral-200">
              <p className="font-semibold text-neutral-950">Cor escolhida</p>
              <p className="mt-1">
                {selectedColor ? getColorLabel(selectedColor) : "—"}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-4 ring-1 ring-neutral-200">
              <p className="font-semibold text-neutral-950">Área escolhida</p>
              <p className="mt-1">
                {selectedLocation ? getLocationLabel(selectedLocation) : "—"}
              </p>
            </div>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
            <label
              htmlFor="simulator-location"
              className="text-sm font-semibold text-neutral-950"
            >
              1. Escolhe a área de personalização
            </label>

            <select
              id="simulator-location"
              value={selectedLocation?.id ?? ""}
              onChange={(event) => {
                setSelectedLocationId(event.target.value || null);
              }}
              className="mt-3 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
            >
              {availableLocations.map((location) => (
                <option key={location.id} value={location.id}>
                  {getLocationLabel(location)}
                </option>
              ))}
            </select>

            {selectedLocation ? (
              <div className="mt-4 space-y-2 text-xs leading-5 text-neutral-500">
                {selectedLocation.max_printing_area_mm ? (
                  <p className="inline-flex items-center">
                    <Ruler className="mr-1.5 h-3.5 w-3.5" />
                    Área máxima: {selectedLocation.max_printing_area_mm}
                  </p>
                ) : null}

                {selectedLocation.customization_types.length > 0 ? (
                  <p>
                    Técnicas possíveis:{" "}
                    {selectedLocation.customization_types.join(", ")}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-neutral-950">
              2. Carrega o teu logótipo
            </p>

            <label
              htmlFor="simulator-logo"
              className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-8 text-center transition hover:border-neutral-400 hover:bg-white"
            >
              <Upload className="h-6 w-6 text-neutral-500" />
              <span className="mt-3 text-sm font-semibold text-neutral-950">
                Escolher ficheiro
              </span>
              <span className="mt-1 text-xs text-neutral-500">
                PNG, JPG, SVG ou WEBP
              </span>
            </label>

            <input
              id="simulator-logo"
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              onChange={handleLogoChange}
              className="sr-only"
            />

            {logoFileName ? (
              <p className="mt-3 truncate text-xs text-neutral-500">
                Ficheiro: {logoFileName}
              </p>
            ) : null}
          </div>

          <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-neutral-950">
                3. Ajusta a maquete
              </p>

              <button
                type="button"
                onClick={resetPosition}
                className="inline-flex items-center rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-200"
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Repor
              </button>
            </div>

            <div className="mt-5 space-y-5">
              <label className="block">
                <span className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                  Horizontal
                  <span>{position.x}%</span>
                </span>
                <input
                  type="range"
                  min="10"
                  max="90"
                  value={position.x}
                  onChange={(event) => {
                    updatePosition("x", Number(event.target.value));
                  }}
                  className="mt-3 w-full"
                />
              </label>

              <label className="block">
                <span className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                  Vertical
                  <span>{position.y}%</span>
                </span>
                <input
                  type="range"
                  min="10"
                  max="90"
                  value={position.y}
                  onChange={(event) => {
                    updatePosition("y", Number(event.target.value));
                  }}
                  className="mt-3 w-full"
                />
              </label>

              <label className="block">
                <span className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                  Tamanho
                  <span>{position.scale}%</span>
                </span>
                <input
                  type="range"
                  min="10"
                  max="80"
                  value={position.scale}
                  onChange={(event) => {
                    updatePosition("scale", Number(event.target.value));
                  }}
                  className="mt-3 w-full"
                />
              </label>

              <label className="block">
                <span className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                  Rotação
                  <span>{position.rotation}º</span>
                </span>
                <input
                  type="range"
                  min="-45"
                  max="45"
                  value={position.rotation}
                  onChange={(event) => {
                    updatePosition("rotation", Number(event.target.value));
                  }}
                  className="mt-3 w-full"
                />
              </label>
            </div>
          </div>

          <div className="rounded-3xl border border-neutral-200 bg-neutral-950 p-5 text-white shadow-sm">
            <div className="flex items-center gap-2">
              <Move className="h-5 w-5 text-neutral-300" />
              <p className="text-sm font-semibold">Resumo da maquete</p>
            </div>

            <dl className="mt-4 space-y-3 text-sm text-neutral-300">
              <div className="flex justify-between gap-4">
                <dt>Cor</dt>
                <dd className="text-right text-white">
                  {selectedColor ? getColorLabel(selectedColor) : "—"}
                </dd>
              </div>

              <div className="flex justify-between gap-4">
                <dt>Área</dt>
                <dd className="text-right text-white">
                  {selectedLocation ? getLocationLabel(selectedLocation) : "—"}
                </dd>
              </div>

              <div className="flex justify-between gap-4">
                <dt>Logótipo</dt>
                <dd className="max-w-48 truncate text-right text-white">
                  {logoFileName ?? "Ainda não carregado"}
                </dd>
              </div>
            </dl>

            <div className="mt-5 rounded-2xl bg-white/10 p-4 text-xs leading-5 text-neutral-300">
              A maquete apresentada é uma simulação visual. A disponibilidade,
              técnica de personalização, área de impressão e preço final serão
              confirmados pela nossa equipa antes da produção.
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}