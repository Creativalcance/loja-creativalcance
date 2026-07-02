"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent,
} from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ImageIcon,
  Maximize2,
  Minus,
  Move,
  Plus,
  RotateCcw,
  Upload,
  X,
} from "lucide-react";
import CustomizationLocationImage from "@/components/product/CustomizationLocationImage";

export type ProductEditorVariant = {
  id: string;
  sku: string;
  color_name: string | null;
  color_hex: string | null;
  size: string | null;
  image_url: string | null;
};

export type ProductEditorLocation = {
  id: string;
  source_location_id: string;
  variant_id: string | null;
  technique: string;
  component_name: string | null;
  location_name: string | null;
  preview_image_url: string | null;
  location_image_url: string | null;
  area_image_url: string | null;
  printing_lines_image_url: string | null;
  max_printing_area_mm: string | null;
  max_area_cm2: number | null;
  table_codes: string[];
  is_recommended: boolean;
};

type LogoPosition = {
  x: number;
  y: number;
  width: number;
  rotation: number;
};

type PrintAreaDimensions = {
  widthMm: number;
  heightMm: number;
};

type ProductCustomizationEditorProps = {
  productName: string;
  productSlug: string;
  productImageUrl: string | null;
  variants: ProductEditorVariant[];
  locations: ProductEditorLocation[];
  initialVariantId?: string | null;
  initialLocationId?: string | null;
  initialQuantity?: number;
};

const initialPosition: LogoPosition = {
  x: 20,
  y: 35,
  width: 60,
  rotation: 0,
};

const DEFAULT_PRINT_AREA: PrintAreaDimensions = {
  widthMm: 50,
  heightMm: 20,
};

const quantityBreaks = [
  "1",
  "10",
  "25",
  "50",
  "100",
  "250",
  "500",
  "1.000",
  "2.500",
];

function getColorLabel(variant: ProductEditorVariant): string {
  if (variant.color_name && variant.size) {
    return `${variant.color_name} · ${variant.size}`;
  }

  return variant.color_name ?? variant.size ?? "Cor disponível";
}

function getLocationLabel(location: ProductEditorLocation): string {
  return (
    location.location_name ??
    location.component_name ??
    location.max_printing_area_mm ??
    "Área de personalização"
  );
}

function getOptionSubtitle(location: ProductEditorLocation): string {
  return [
    location.component_name,
    location.location_name,
    location.max_printing_area_mm,
  ]
    .filter(Boolean)
    .join(" · ");
}

function getPreviewImageCandidates(params: {
  selectedLocation: ProductEditorLocation | null;
  selectedColor: ProductEditorVariant | null;
  productImageUrl: string | null;
}): string[] {
  return [
    params.selectedLocation?.printing_lines_image_url,
    params.selectedLocation?.area_image_url,
    params.selectedLocation?.location_image_url,
    params.selectedLocation?.preview_image_url,
    params.selectedColor?.image_url,
    params.productImageUrl,
  ].filter((url): url is string => Boolean(url?.trim()));
}

function getAvailableLocations(params: {
  selectedVariantId: string | null;
  locations: ProductEditorLocation[];
}): ProductEditorLocation[] {
  const colorLocations = params.locations.filter(
    (location) => location.variant_id === params.selectedVariantId,
  );

  if (colorLocations.length > 0) {
    return colorLocations;
  }

  return params.locations;
}

function parsePrintAreaDimensions(value: string | null): PrintAreaDimensions {
  if (!value) {
    return DEFAULT_PRINT_AREA;
  }

  const numbers = value
    .replace(",", ".")
    .match(/\d+(\.\d+)?/g)
    ?.map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item > 0);

  if (!numbers || numbers.length < 2) {
    return DEFAULT_PRINT_AREA;
  }

  return {
    widthMm: numbers[0],
    heightMm: numbers[1],
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function getLogoHeightPercent(params: {
  logoWidthPercent: number;
  printAreaAspectRatio: number;
  logoAspectRatio: number;
}): number {
  return (
    (params.logoWidthPercent * params.printAreaAspectRatio) /
    params.logoAspectRatio
  );
}

function getSafeLogoPosition(params: {
  position: LogoPosition;
  printAreaAspectRatio: number;
  logoAspectRatio: number;
}): LogoPosition {
  const safeWidth = clamp(params.position.width, 10, 100);
  const logoHeight = getLogoHeightPercent({
    logoWidthPercent: safeWidth,
    printAreaAspectRatio: params.printAreaAspectRatio,
    logoAspectRatio: params.logoAspectRatio,
  });

  return {
    x: clamp(params.position.x, 0, Math.max(0, 100 - safeWidth)),
    y: clamp(params.position.y, 0, Math.max(0, 100 - logoHeight)),
    width: safeWidth,
    rotation: clamp(params.position.rotation, -15, 15),
  };
}

function getTechniqueEstimatedUnitPrice(technique: string | null): number {
  const normalized = technique?.normalize("NFD").toLowerCase() ?? "";

  if (normalized.includes("bordado")) {
    return 0.75;
  }

  if (normalized.includes("uv")) {
    return 0.45;
  }

  if (normalized.includes("laser")) {
    return 0.52;
  }

  if (normalized.includes("tampografia")) {
    return 0.42;
  }

  if (normalized.includes("transfer")) {
    return 0.49;
  }

  return 0.5;
}

function getEstimatedProductionDays(technique: string | null): string {
  const normalized = technique?.normalize("NFD").toLowerCase() ?? "";

  if (normalized.includes("bordado")) {
    return "5 a 8 dias úteis";
  }

  if (normalized.includes("tampografia")) {
    return "3 a 6 dias úteis";
  }

  if (normalized.includes("uv")) {
    return "1 a 4 dias úteis";
  }

  if (normalized.includes("laser")) {
    return "1 a 4 dias úteis";
  }

  return "3 a 6 dias úteis";
}

function getPrintAreaPlacement(location: ProductEditorLocation): {
  left: number;
  top: number;
  width: number;
} {
  const label = `${location.location_name ?? ""} ${location.component_name ?? ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (label.includes("verso") || label.includes("costas") || label.includes("trase")) {
    return {
      left: 50,
      top: 52,
      width: 24,
    };
  }

  if (label.includes("frente") || label.includes("front")) {
    return {
      left: 50,
      top: 48,
      width: 26,
    };
  }

  if (label.includes("lateral") || label.includes("lado")) {
    return {
      left: 58,
      top: 50,
      width: 22,
    };
  }

  if (label.includes("fita")) {
    return {
      left: 50,
      top: 42,
      width: 28,
    };
  }

  return {
    left: 50,
    top: 50,
    width: 25,
  };
}

export default function ProductCustomizationEditor({
  productName,
  productSlug,
  productImageUrl,
  variants,
  locations,
  initialVariantId,
  initialLocationId,
  initialQuantity = 1,
}: ProductCustomizationEditorProps) {
  const printAreaRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const initialValidVariantId = variants.some(
    (variant) => variant.id === initialVariantId,
  )
    ? initialVariantId ?? null
    : variants[0]?.id ?? null;

  const initialValidLocationId =
    locations.find(
      (location) =>
        location.id === initialLocationId ||
        location.source_location_id === initialLocationId,
    )?.id ??
    locations.find((location) => location.is_recommended)?.id ??
    locations[0]?.id ??
    null;

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    initialValidVariantId,
  );
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    initialValidLocationId,
  );
  const [quantity, setQuantity] = useState(Math.max(1, initialQuantity));
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoFileName, setLogoFileName] = useState<string | null>(null);
  const [logoAspectRatio, setLogoAspectRatio] = useState(3);
  const [position, setPosition] = useState<LogoPosition>(initialPosition);
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  const [showPriceTable, setShowPriceTable] = useState(false);
  const [showProductionTimes, setShowProductionTimes] = useState(false);
  const [needsDesignHelp, setNeedsDesignHelp] = useState(false);
  const [extraProof, setExtraProof] = useState(false);
  const [nominative, setNominative] = useState(false);
  const [internalReference, setInternalReference] = useState("");
  const [notes, setNotes] = useState("");

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
      availableLocations.find((location) => location.is_recommended) ??
      availableLocations[0] ??
      null,
    [availableLocations, selectedLocationId],
  );

  const printAreaDimensions = parsePrintAreaDimensions(
    selectedLocation?.max_printing_area_mm ?? null,
  );
  const printAreaAspectRatio =
    printAreaDimensions.widthMm / printAreaDimensions.heightMm;

  const safePosition = getSafeLogoPosition({
    position,
    printAreaAspectRatio,
    logoAspectRatio,
  });

  const logoHeightPercent = getLogoHeightPercent({
    logoWidthPercent: safePosition.width,
    printAreaAspectRatio,
    logoAspectRatio,
  });

  const previewImageUrls = getPreviewImageCandidates({
    selectedLocation,
    selectedColor,
    productImageUrl,
  });

  const personalizationUnitPrice = getTechniqueEstimatedUnitPrice(
    selectedLocation?.technique ?? null,
  );
  const personalizationSubtotal = roundMoney(personalizationUnitPrice * quantity);
  const extrasTotal = roundMoney(
    (needsDesignHelp ? 21 : 0) +
      (extraProof ? 15 : 0) +
      (nominative ? 0.7 * quantity : 0),
  );
  const estimatedTotal = roundMoney(personalizationSubtotal + extrasTotal);
  const productionDays = getEstimatedProductionDays(
    selectedLocation?.technique ?? null,
  );

  useEffect(() => {
    if (
      selectedLocationId &&
      availableLocations.some((location) => location.id === selectedLocationId)
    ) {
      return;
    }

    setSelectedLocationId(
      availableLocations.find((location) => location.is_recommended)?.id ??
        availableLocations[0]?.id ??
        null,
    );
  }, [availableLocations, selectedLocationId]);

  useEffect(() => {
    setPosition(initialPosition);
  }, [selectedLocationId]);

  useEffect(() => {
    setPosition((current) =>
      getSafeLogoPosition({
        position: current,
        printAreaAspectRatio,
        logoAspectRatio,
      }),
    );
  }, [printAreaAspectRatio, logoAspectRatio]);

  useEffect(() => {
    return () => {
      if (logoPreviewUrl) {
        URL.revokeObjectURL(logoPreviewUrl);
      }
    };
  }, [logoPreviewUrl]);

  function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      return;
    }

    if (logoPreviewUrl) {
      URL.revokeObjectURL(logoPreviewUrl);
    }

    setLogoFileName(file.name);

    if (!file.type.startsWith("image/")) {
      setLogoPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      if (image.naturalWidth > 0 && image.naturalHeight > 0) {
        setLogoAspectRatio(image.naturalWidth / image.naturalHeight);
      }
    };

    image.src = objectUrl;

    setLogoPreviewUrl(objectUrl);
  }

  function updatePosition(key: keyof LogoPosition, value: number) {
    setPosition((current) =>
      getSafeLogoPosition({
        position: {
          ...current,
          [key]: value,
        },
        printAreaAspectRatio,
        logoAspectRatio,
      }),
    );
  }

  function resetPosition() {
    setPosition(initialPosition);
  }

  function fitLogoToArea() {
    setPosition(
      getSafeLogoPosition({
        position: {
          x: 5,
          y: 20,
          width: 90,
          rotation: 0,
        },
        printAreaAspectRatio,
        logoAspectRatio,
      }),
    );
  }

  function centerLogo() {
    const centeredWidth = safePosition.width;
    const centeredHeight = getLogoHeightPercent({
      logoWidthPercent: centeredWidth,
      printAreaAspectRatio,
      logoAspectRatio,
    });

    setPosition(
      getSafeLogoPosition({
        position: {
          ...safePosition,
          x: (100 - centeredWidth) / 2,
          y: (100 - centeredHeight) / 2,
        },
        printAreaAspectRatio,
        logoAspectRatio,
      }),
    );
  }

  function reduceLogo() {
    updatePosition("width", safePosition.width - 8);
  }

  function enlargeLogo() {
    updatePosition("width", safePosition.width + 8);
  }

  function handleLogoPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!printAreaRef.current) {
      return;
    }

    const rect = printAreaRef.current.getBoundingClientRect();
    const logoLeft = rect.left + (safePosition.x / 100) * rect.width;
    const logoTop = rect.top + (safePosition.y / 100) * rect.height;

    dragStateRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - logoLeft,
      offsetY: event.clientY - logoTop,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleLogoPointerMove(event: PointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    if (!printAreaRef.current) {
      return;
    }

    const rect = printAreaRef.current.getBoundingClientRect();

    const nextX =
      ((event.clientX - rect.left - dragState.offsetX) / rect.width) * 100;
    const nextY =
      ((event.clientY - rect.top - dragState.offsetY) / rect.height) * 100;

    setPosition((current) =>
      getSafeLogoPosition({
        position: {
          ...current,
          x: nextX,
          y: nextY,
        },
        printAreaAspectRatio,
        logoAspectRatio,
      }),
    );
  }

  function handleLogoPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (dragStateRef.current?.pointerId === event.pointerId) {
      dragStateRef.current = null;
    }
  }

  if (locations.length === 0 || !selectedLocation) {
    return (
      <section className="mt-8 rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
        <h2 className="text-xl font-semibold text-neutral-950">
          Este produto ainda não tem áreas de personalização disponíveis
        </h2>

        <p className="mx-auto mt-3 max-w-2xl text-neutral-600">
          Pode voltar ao produto e adicionar ao carrinho sem maquete. A
          personalização será confirmada antes da conclusão da encomenda.
        </p>

        <Link
          href={`/produto/${productSlug}`}
          className="mt-6 inline-flex items-center justify-center rounded-2xl bg-neutral-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
        >
          Voltar ao produto
        </Link>
      </section>
    );
  }

  return (
    <>
      <section className="mt-8 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
            Personalização
          </p>

          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950">
            Escolha a área e crie a maquete
          </h2>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-neutral-600">
            Seleccione a localização, carregue o logótipo e ajuste-o dentro da
            área técnica permitida.
          </p>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)_360px]">
          <aside className="rounded-3xl border border-neutral-200 bg-neutral-50 p-3">
            <div className="mb-3 px-2 pt-2">
              <p className="text-sm font-semibold text-neutral-950">
                Opções disponíveis
              </p>
            </div>

            <div className="max-h-[780px] space-y-2 overflow-y-auto pr-1">
              {availableLocations.map((location) => {
                const isSelected = location.id === selectedLocation.id;

                return (
                  <button
                    key={location.id}
                    type="button"
                    onClick={() => setSelectedLocationId(location.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      isSelected
                        ? "border-neutral-950 bg-white shadow-sm"
                        : "border-transparent bg-white/70 hover:border-neutral-300 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                          {location.technique}
                        </p>

                        <p className="mt-2 text-base font-semibold text-neutral-950">
                          {getLocationLabel(location)}
                        </p>
                      </div>

                      {location.is_recommended ? (
                        <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                          Recomendada
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3 space-y-1 text-sm text-neutral-600">
                      {location.component_name ? (
                        <p>{location.component_name}</p>
                      ) : null}

                      {location.max_printing_area_mm ? (
                        <p>{location.max_printing_area_mm}</p>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white">
  <div className="border-b border-neutral-200 px-6 py-5">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
          Preview da maquete
        </p>

        <h3 className="mt-2 text-2xl font-semibold text-neutral-950">
          {getLocationLabel(selectedLocation)}
        </h3>

        <p className="mt-1 text-sm text-neutral-600">
          {getOptionSubtitle(selectedLocation)}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs font-semibold text-neutral-600">
        <span className="rounded-full bg-neutral-100 px-3 py-1.5">
          {selectedLocation.technique}
        </span>

        {selectedLocation.max_printing_area_mm ? (
          <span className="rounded-full bg-neutral-100 px-3 py-1.5">
            {selectedLocation.max_printing_area_mm}
          </span>
        ) : null}

        <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700 ring-1 ring-emerald-200">
          Área bloqueada
        </span>
      </div>
    </div>
  </div>

  <div className="bg-white px-6 py-8">
    <div className="relative mx-auto flex min-h-[680px] max-w-5xl items-center justify-center overflow-hidden rounded-3xl bg-white">
      {previewImageUrls.length > 0 ? (
        <CustomizationLocationImage
          urls={previewImageUrls}
          alt={productName}
          className="h-full max-h-[680px] w-full object-contain p-6"
        />
      ) : (
        <div className="flex h-[600px] w-full items-center justify-center rounded-3xl bg-neutral-50 text-neutral-400">
          <ImageIcon className="h-10 w-10" />
        </div>
      )}

      {(() => {
        const placement = getPrintAreaPlacement(selectedLocation);

        return (
          <div
            className="pointer-events-none absolute"
            style={{
              left: `${placement.left}%`,
              top: `${placement.top}%`,
              width: `${placement.width}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div
              ref={printAreaRef}
              className="pointer-events-auto relative overflow-hidden rounded-xl border-2 border-dashed border-emerald-500 bg-white/50 shadow-[0_0_0_9999px_rgba(255,255,255,0.02)] backdrop-blur-[1px]"
              style={{
                aspectRatio: `${printAreaDimensions.widthMm} / ${printAreaDimensions.heightMm}`,
              }}
            >
              <div
                role="button"
                tabIndex={0}
                onPointerDown={handleLogoPointerDown}
                onPointerMove={handleLogoPointerMove}
                onPointerUp={handleLogoPointerUp}
                onPointerCancel={handleLogoPointerUp}
                className="absolute cursor-grab touch-none active:cursor-grabbing"
                style={{
                  left: `${safePosition.x}%`,
                  top: `${safePosition.y}%`,
                  width: `${safePosition.width}%`,
                  height: `${logoHeightPercent}%`,
                  transform: `rotate(${safePosition.rotation}deg)`,
                  transformOrigin: "center center",
                }}
              >
                {logoPreviewUrl ? (
                  <img
                    src={logoPreviewUrl}
                    alt="Logótipo carregado"
                    draggable={false}
                    className="h-full w-full select-none object-contain"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-lg border border-neutral-300 bg-white/90 px-2 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                    Logótipo
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  </div>

  <div className="border-t border-neutral-200 bg-neutral-50 px-6 py-5">
    <div className="grid gap-4 md:grid-cols-4">
      <div className="rounded-2xl bg-white p-4 ring-1 ring-neutral-200">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
          Técnica
        </p>
        <p className="mt-1 font-semibold text-neutral-950">
          {selectedLocation.technique}
        </p>
      </div>

      <div className="rounded-2xl bg-white p-4 ring-1 ring-neutral-200">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
          Localização
        </p>
        <p className="mt-1 font-semibold text-neutral-950">
          {getLocationLabel(selectedLocation)}
        </p>
      </div>

      <div className="rounded-2xl bg-white p-4 ring-1 ring-neutral-200">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
          Componente
        </p>
        <p className="mt-1 font-semibold text-neutral-950">
          {selectedLocation.component_name ?? "—"}
        </p>
      </div>

      <div className="rounded-2xl bg-white p-4 ring-1 ring-neutral-200">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
          Área máxima
        </p>
        <p className="mt-1 font-semibold text-neutral-950">
          {selectedLocation.max_printing_area_mm ?? "—"}
        </p>
      </div>
    </div>

    <p className="mt-4 text-xs leading-5 text-neutral-500">
      O logótipo é apresentado diretamente sobre o produto e fica bloqueado
      dentro da área técnica permitida. A posição final será validada antes da
      produção.
    </p>
  </div>
</div>

          <aside className="space-y-5">
            <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-neutral-950">
                1. Cor e quantidade
              </p>

              {variants.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {variants.map((variant) => {
                    const isSelected = variant.id === selectedVariantId;

                    return (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => setSelectedVariantId(variant.id)}
                        className={`inline-flex items-center rounded-full border px-3 py-2 text-sm font-medium transition ${
                          isSelected
                            ? "border-neutral-950 bg-neutral-950 text-white"
                            : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"
                        }`}
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
              ) : null}

              <div className="mt-4 flex overflow-hidden rounded-2xl border border-neutral-300 bg-white">
                <button
                  type="button"
                  onClick={() =>
                    setQuantity((current) => Math.max(1, current - 1))
                  }
                  className="flex h-12 w-12 items-center justify-center border-r border-neutral-200 text-lg font-semibold text-neutral-700 transition hover:bg-neutral-50"
                >
                  −
                </button>

                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setQuantity(
                      Number.isFinite(value) ? Math.max(1, value) : 1,
                    );
                  }}
                  className="h-12 min-w-0 flex-1 border-0 bg-white px-3 text-center text-sm font-semibold text-neutral-950 outline-none"
                />

                <button
                  type="button"
                  onClick={() => setQuantity((current) => current + 1)}
                  className="flex h-12 w-12 items-center justify-center border-l border-neutral-200 text-lg font-semibold text-neutral-700 transition hover:bg-neutral-50"
                >
                  +
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-neutral-950">
                2. Logótipo
              </p>

              <label
                htmlFor="editor-logo"
                className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-8 text-center transition hover:border-neutral-400 hover:bg-white"
              >
                <Upload className="h-6 w-6 text-neutral-500" />
                <span className="mt-3 text-sm font-semibold text-neutral-950">
                  Carregar ficheiro
                </span>
                <span className="mt-1 text-xs text-neutral-500">
                  Recomendado: SVG, PDF, PNG ou JPG
                </span>
              </label>

              <input
                id="editor-logo"
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp,application/pdf"
                onChange={handleLogoChange}
                className="sr-only"
              />

              {logoFileName ? (
                <div className="mt-3 rounded-2xl bg-neutral-50 p-3 text-xs leading-5 text-neutral-600">
                  Ficheiro carregado:{" "}
                  <span className="font-semibold text-neutral-950">
                    {logoFileName}
                  </span>
                </div>
              ) : null}
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-semibold text-neutral-950">
                  3. Ajustar maquete
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

              <div className="mt-4 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={reduceLogo}
                  className="inline-flex items-center justify-center rounded-2xl border border-neutral-200 bg-white px-3 py-3 text-sm font-semibold text-neutral-700 transition hover:border-neutral-400"
                >
                  <Minus className="mr-1.5 h-4 w-4" />
                  Reduzir
                </button>

                <button
                  type="button"
                  onClick={centerLogo}
                  className="inline-flex items-center justify-center rounded-2xl border border-neutral-200 bg-white px-3 py-3 text-sm font-semibold text-neutral-700 transition hover:border-neutral-400"
                >
                  <Move className="mr-1.5 h-4 w-4" />
                  Centrar
                </button>

                <button
                  type="button"
                  onClick={enlargeLogo}
                  className="inline-flex items-center justify-center rounded-2xl border border-neutral-200 bg-white px-3 py-3 text-sm font-semibold text-neutral-700 transition hover:border-neutral-400"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Aumentar
                </button>
              </div>

              <button
                type="button"
                onClick={fitLogoToArea}
                className="mt-2 inline-flex w-full items-center justify-center rounded-2xl border border-neutral-950 bg-white px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-50"
              >
                <Maximize2 className="mr-1.5 h-4 w-4" />
                Ajustar à área máxima
              </button>

              <button
                type="button"
                onClick={() => setShowAdvancedControls((current) => !current)}
                className="mt-4 text-sm font-semibold text-neutral-950 underline-offset-4 hover:underline"
              >
                {showAdvancedControls
                  ? "Ocultar ajustes avançados"
                  : "Mostrar ajustes avançados"}
              </button>

              {showAdvancedControls ? (
                <div className="mt-5 space-y-5">
                  <label className="block">
                    <span className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                      Horizontal
                      <span>{Math.round(safePosition.x)}%</span>
                    </span>
                    <input
                      type="range"
                      min="0"
                      max={Math.max(0, 100 - safePosition.width)}
                      value={safePosition.x}
                      onChange={(event) => {
                        updatePosition("x", Number(event.target.value));
                      }}
                      className="mt-3 w-full"
                    />
                  </label>

                  <label className="block">
                    <span className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                      Vertical
                      <span>{Math.round(safePosition.y)}%</span>
                    </span>
                    <input
                      type="range"
                      min="0"
                      max={Math.max(0, 100 - logoHeightPercent)}
                      value={safePosition.y}
                      onChange={(event) => {
                        updatePosition("y", Number(event.target.value));
                      }}
                      className="mt-3 w-full"
                    />
                  </label>

                  <label className="block">
                    <span className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                      Largura
                      <span>{Math.round(safePosition.width)}%</span>
                    </span>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={safePosition.width}
                      onChange={(event) => {
                        updatePosition("width", Number(event.target.value));
                      }}
                      className="mt-3 w-full"
                    />
                  </label>

                  <label className="block">
                    <span className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                      Rotação
                      <span>{safePosition.rotation}º</span>
                    </span>
                    <input
                      type="range"
                      min="-15"
                      max="15"
                      value={safePosition.rotation}
                      onChange={(event) => {
                        updatePosition("rotation", Number(event.target.value));
                      }}
                      className="mt-3 w-full"
                    />
                  </label>
                </div>
              ) : null}
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-neutral-950">
                4. Extras
              </p>

              <div className="mt-4 space-y-3 text-sm text-neutral-700">
                <label className="flex gap-3 rounded-2xl bg-neutral-50 p-3">
                  <input
                    type="checkbox"
                    checked={needsDesignHelp}
                    onChange={(event) =>
                      setNeedsDesignHelp(event.target.checked)
                    }
                    className="mt-1"
                  />
                  <span>
                    <span className="block font-semibold text-neutral-950">
                      Preciso de ajuda a preparar o logótipo
                    </span>
                    <span className="text-xs text-neutral-500">
                      Tratamento gráfico estimado: {formatPrice(21)}
                    </span>
                  </span>
                </label>

                <label className="flex gap-3 rounded-2xl bg-neutral-50 p-3">
                  <input
                    type="checkbox"
                    checked={extraProof}
                    onChange={(event) => setExtraProof(event.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block font-semibold text-neutral-950">
                      Quero validação gráfica adicional
                    </span>
                    <span className="text-xs text-neutral-500">
                      Maquete extra estimada: {formatPrice(15)}
                    </span>
                  </span>
                </label>

                <label className="flex gap-3 rounded-2xl bg-neutral-50 p-3">
                  <input
                    type="checkbox"
                    checked={nominative}
                    onChange={(event) => setNominative(event.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block font-semibold text-neutral-950">
                      Personalização nominativa
                    </span>
                    <span className="text-xs text-neutral-500">
                      Estimado: {formatPrice(0.7)} por unidade
                    </span>
                  </span>
                </label>
              </div>
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-neutral-950">
                5. Referência e observações
              </p>

              <label className="mt-4 block">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                  Referência interna
                </span>
                <input
                  type="text"
                  value={internalReference}
                  onChange={(event) => setInternalReference(event.target.value)}
                  placeholder="Ex.: Evento, campanha ou cliente"
                  className="mt-2 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
                />
              </label>

              <label className="mt-4 block">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                  Observações
                </span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Ex.: Colocar centrado, preferencialmente em branco."
                  rows={4}
                  className="mt-2 w-full resize-none rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
                />
              </label>
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-neutral-950 p-5 text-white shadow-sm">
              <p className="text-sm font-semibold">Resumo da maquete</p>

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
                    {getLocationLabel(selectedLocation)}
                  </dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt>Técnica</dt>
                  <dd className="text-right text-white">
                    {selectedLocation.technique}
                  </dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt>Quantidade</dt>
                  <dd className="text-right text-white">
                    {quantity.toLocaleString("pt-PT")} un.
                  </dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt>Logótipo</dt>
                  <dd className="max-w-48 truncate text-right text-white">
                    {logoFileName ?? "Ainda não carregado"}
                  </dd>
                </div>

                <div className="border-t border-white/10 pt-3">
                  <div className="flex justify-between gap-4">
                    <dt>Personalização</dt>
                    <dd className="text-right text-white">
                      {formatPrice(personalizationSubtotal)}
                    </dd>
                  </div>

                  <div className="mt-2 flex justify-between gap-4">
                    <dt>Extras</dt>
                    <dd className="text-right text-white">
                      {formatPrice(extrasTotal)}
                    </dd>
                  </div>

                  <div className="mt-3 flex justify-between gap-4 text-base">
                    <dt className="font-semibold text-white">
                      Total estimado
                    </dt>
                    <dd className="font-semibold text-white">
                      {formatPrice(estimatedTotal)}
                    </dd>
                  </div>
                </div>
              </dl>

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setShowPriceTable(true)}
                  className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  Ver tabela
                </button>

                <button
                  type="button"
                  onClick={() => setShowProductionTimes(true)}
                  className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  Produção
                </button>
              </div>

              <div className="mt-5 rounded-2xl bg-white/10 p-4 text-xs leading-5 text-neutral-300">
                Valores sem IVA. A maquete apresentada é uma simulação visual.
              </div>

              <Link
                href={`/produto/${productSlug}`}
                className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-100"
              >
                Continuar encomenda
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </aside>
        </div>
      </section>

      {showPriceTable ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 px-4">
          <div className="max-h-[86vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-5">
              <div>
                <h3 className="text-xl font-semibold text-neutral-950">
                  Tabela de preços
                </h3>
                <p className="mt-1 text-sm text-neutral-500">
                  Técnica: {selectedLocation.technique}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowPriceTable(false)}
                className="rounded-full bg-neutral-100 p-2 text-neutral-600 transition hover:bg-neutral-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-auto p-6">
              <table className="min-w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    <th className="border-b border-neutral-200 px-4 py-3 text-left font-semibold text-neutral-500">
                      Quantidade
                    </th>

                    {quantityBreaks.map((item) => (
                      <th
                        key={item}
                        className="border-b border-neutral-200 px-4 py-3 text-right font-semibold text-neutral-950"
                      >
                        {item}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  <tr>
                    <td className="border-b border-neutral-100 px-4 py-3 font-medium text-neutral-500">
                      Preço / un.
                    </td>

                    {quantityBreaks.map((item, index) => (
                      <td
                        key={item}
                        className="border-b border-neutral-100 px-4 py-3 text-right font-semibold text-neutral-950"
                      >
                        {formatPrice(
                          Math.max(
                            0.12,
                            personalizationUnitPrice - index * 0.035,
                          ),
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>

              <p className="mt-4 text-xs leading-5 text-neutral-500">
                Tabela indicativa para apoio à simulação. Os valores finais
                serão confirmados com base na técnica, área e ficheiro recebido.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {showProductionTimes ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 px-4">
          <div className="max-h-[86vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-5">
              <div>
                <h3 className="text-xl font-semibold text-neutral-950">
                  Tempos de produção
                </h3>
                <p className="mt-1 text-sm text-neutral-500">
                  Estimativa por técnica e quantidade.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowProductionTimes(false)}
                className="rounded-full bg-neutral-100 p-2 text-neutral-600 transition hover:bg-neutral-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-auto p-6">
              <table className="min-w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    <th className="border-b border-neutral-200 px-4 py-3 text-left font-semibold text-neutral-500">
                      Técnica
                    </th>
                    <th className="border-b border-neutral-200 px-4 py-3 text-right font-semibold text-neutral-950">
                      1-50
                    </th>
                    <th className="border-b border-neutral-200 px-4 py-3 text-right font-semibold text-neutral-950">
                      51-250
                    </th>
                    <th className="border-b border-neutral-200 px-4 py-3 text-right font-semibold text-neutral-950">
                      251-1000
                    </th>
                    <th className="border-b border-neutral-200 px-4 py-3 text-right font-semibold text-neutral-950">
                      1000+
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {[
                    "UV Digital",
                    "Laser",
                    "Laser circular",
                    "Tampografia",
                    "Bordado",
                    "Transfer Digital",
                  ].map((technique) => (
                    <tr key={technique}>
                      <td className="border-b border-neutral-100 px-4 py-3 font-medium text-neutral-950">
                        {technique}
                      </td>
                      <td className="border-b border-neutral-100 px-4 py-3 text-right text-neutral-700">
                        1-3 dias
                      </td>
                      <td className="border-b border-neutral-100 px-4 py-3 text-right text-neutral-700">
                        2-5 dias
                      </td>
                      <td className="border-b border-neutral-100 px-4 py-3 text-right text-neutral-700">
                        4-8 dias
                      </td>
                      <td className="border-b border-neutral-100 px-4 py-3 text-right text-neutral-700">
                        Sob consulta
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <p className="mt-4 text-xs leading-5 text-neutral-500">
                Os tempos de produção podem variar consoante a técnica,
                disponibilidade, dimensão da personalização e validação da
                maquete.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}