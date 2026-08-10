"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type PointerEvent,
  type SyntheticEvent,
} from "react";
import {
  ArrowRight,
  Maximize2,
  Minus,
  Move,
  Plus,
  RotateCcw,
  Ruler,
  Upload,
  X,
} from "lucide-react";
import { saveCustomizationDraftAction } from "@/lib/customization/actions";

export type ProductEditorVariant = {
  id: string;
  sku: string;
  color_name: string | null;
  color_hex: string | null;
  size: string | null;
  image_url: string | null;
};

export type ProductEditorPrice = {
  variant_id: string | null;
  final_price: number;
  quantity_min: number;
  quantity_max: number | null;
  currency: string;
};

export type ProductEditorLocation = {
  id: string;
  source_location_id: string;
  variant_id: string | null;
  component_id: string | null;
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

type PreviewPrintArea = {
  left: number;
  top: number;
  width: number;
  height: number;
  aspectRatio: number;
};

type LocationGroup = {
  id: string;
  componentId: string;
  locationName: string;
  componentName: string | null;
  maxPrintingAreaMm: string | null;
  isRecommended: boolean;
  options: ProductEditorLocation[];
};

type ProductCustomizationEditorProps = {
  productId: string;
  supplierId: string | null;
  productName: string;
  productSlug: string;
  productImageUrl: string | null;
  variants: ProductEditorVariant[];
  locations: ProductEditorLocation[];
  productPrices: ProductEditorPrice[];
  initialDraftId?: string | null;
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

type ComponentGroup = {
  id: string;
  name: string;
  sourceIds: string[];
  isRecommended: boolean;
};

function getProductImageCandidates(params: {
  selectedColor: ProductEditorVariant | null;
  productImageUrl: string | null;
}): string[] {
  return Array.from(
    new Set(
      [
        params.selectedColor?.image_url,
        params.productImageUrl,
      ].filter((url): url is string => Boolean(url)),
    ),
  );
}

function getGuideImageCandidates(
  selectedLocation: ProductEditorLocation | null,
): string[] {
  return Array.from(
    new Set(
      [
        selectedLocation?.printing_lines_image_url,
        selectedLocation?.area_image_url,
      ].filter((url): url is string => Boolean(url)),
    ),
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

function getColorLabel(variant: ProductEditorVariant | null): string {
  if (!variant) {
    return "Cor selecionada";
  }

  if (variant.color_name && variant.size) {
    return `${variant.color_name} · ${variant.size}`;
  }

  return variant.color_name ?? variant.size ?? "Cor selecionada";
}

function getLocationLabel(location: ProductEditorLocation): string {
  return (
    location.location_name ??
    location.component_name ??
    location.max_printing_area_mm ??
    "Área de personalização"
  );
}

function getLocationGroupKey(location: ProductEditorLocation): string {
  return [
    location.component_name ?? "componente",
    location.location_name ?? "local",
  ]
    .join(":")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function dedupeByTechnique(
  options: ProductEditorLocation[],
): ProductEditorLocation[] {
  const map = new Map<string, ProductEditorLocation>();

  for (const option of options) {
    const key = option.technique
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    const existing = map.get(key);

    if (!existing) {
      map.set(key, option);
      continue;
    }

    const shouldReplace =
      (!existing.is_recommended && option.is_recommended) ||
      (!existing.preview_image_url && Boolean(option.preview_image_url)) ||
      (!existing.printing_lines_image_url &&
        Boolean(option.printing_lines_image_url));

    if (shouldReplace) {
      map.set(key, option);
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.technique.localeCompare(b.technique, "pt-PT"),
  );
}

function buildLocationGroups(params: {
  locations: ProductEditorLocation[];
  selectedVariantId: string | null;
}): LocationGroup[] {
  const variantLocations = params.selectedVariantId
    ? params.locations.filter(
        (location) => location.variant_id === params.selectedVariantId,
      )
    : [];

  const activeLocations =
    variantLocations.length > 0
      ? variantLocations
      : params.locations.filter((location) => !location.variant_id);

  const fallbackLocations =
    activeLocations.length > 0 ? activeLocations : params.locations;

  const groups = new Map<string, LocationGroup>();

  for (const location of fallbackLocations) {
    const key = getLocationGroupKey(location);
    const existingGroup = groups.get(key);

    if (!existingGroup) {
      groups.set(key, {
        id: key,
        componentId:
          location.component_id ??
          location.component_name ??
          "componente",
        locationName: getLocationLabel(location),
        componentName: location.component_name,
        maxPrintingAreaMm: location.max_printing_area_mm,
        isRecommended: location.is_recommended,
        options: [location],
      });

      continue;
    }

    existingGroup.options.push(location);

    if (location.is_recommended) {
      existingGroup.isRecommended = true;
    }
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      options: dedupeByTechnique(group.options),
    }))
    .sort((a, b) => {
      if (a.isRecommended && !b.isRecommended) {
        return -1;
      }

      if (!a.isRecommended && b.isRecommended) {
        return 1;
      }

      return a.locationName.localeCompare(b.locationName, "pt-PT");
    });
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

function formatPrice(value: number, currency = "EUR"): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency,
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
  const angle = (clamp(params.position.rotation, -15, 15) * Math.PI) / 180;
  const absoluteCosine = Math.abs(Math.cos(angle));
  const absoluteSine = Math.abs(Math.sin(angle));
  const heightPerWidth =
    params.printAreaAspectRatio / params.logoAspectRatio;
  const rotatedWidthPerWidth =
    absoluteCosine + heightPerWidth * absoluteSine;
  const rotatedHeightPerWidth =
    absoluteSine + heightPerWidth * absoluteCosine;
  const maximumWidth = Math.min(
    100,
    100 / Math.max(rotatedWidthPerWidth, Number.EPSILON),
    100 / Math.max(rotatedHeightPerWidth, Number.EPSILON),
  );
  const safeWidth = clamp(
    params.position.width,
    Math.min(10, maximumWidth),
    maximumWidth,
  );

  const logoHeight = getLogoHeightPercent({
    logoWidthPercent: safeWidth,
    printAreaAspectRatio: params.printAreaAspectRatio,
    logoAspectRatio: params.logoAspectRatio,
  });

  const rotatedWidth = safeWidth * rotatedWidthPerWidth;
  const rotatedHeight = safeWidth * rotatedHeightPerWidth;
  const horizontalOverhang = Math.max(0, (rotatedWidth - safeWidth) / 2);
  const verticalOverhang = Math.max(0, (rotatedHeight - logoHeight) / 2);

  return {
    x: clamp(
      params.position.x,
      horizontalOverhang,
      Math.max(horizontalOverhang, 100 - safeWidth - horizontalOverhang),
    ),
    y: clamp(
      params.position.y,
      verticalOverhang,
      Math.max(verticalOverhang, 100 - logoHeight - verticalOverhang),
    ),
    width: safeWidth,
    rotation: clamp(params.position.rotation, -15, 15),
  };
}

function getCenteredLogoPosition(params: {
  width?: number;
  printAreaAspectRatio: number;
  logoAspectRatio: number;
}): LogoPosition {
  const width = clamp(params.width ?? 60, 10, 100);
  const height = getLogoHeightPercent({
    logoWidthPercent: width,
    printAreaAspectRatio: params.printAreaAspectRatio,
    logoAspectRatio: params.logoAspectRatio,
  });

  return getSafeLogoPosition({
    position: {
      x: Math.max(0, (100 - width) / 2),
      y: Math.max(0, (100 - height) / 2),
      width,
      rotation: 0,
    },
    printAreaAspectRatio: params.printAreaAspectRatio,
    logoAspectRatio: params.logoAspectRatio,
  });
}

function getVisualLogoPosition(params: {
  position: LogoPosition;
  physicalPrintAreaAspectRatio: number;
  visualPrintAreaAspectRatio: number;
  logoAspectRatio: number;
}): LogoPosition {
  const physicalHeight = getLogoHeightPercent({
    logoWidthPercent: params.position.width,
    printAreaAspectRatio: params.physicalPrintAreaAspectRatio,
    logoAspectRatio: params.logoAspectRatio,
  });
  const centreX = params.position.x + params.position.width / 2;
  const centreY = params.position.y + physicalHeight / 2;
  const visualHeight = getLogoHeightPercent({
    logoWidthPercent: params.position.width,
    printAreaAspectRatio: params.visualPrintAreaAspectRatio,
    logoAspectRatio: params.logoAspectRatio,
  });

  return getSafeLogoPosition({
    position: {
      x: centreX - params.position.width / 2,
      y: centreY - visualHeight / 2,
      width: params.position.width,
      rotation: params.position.rotation,
    },
    printAreaAspectRatio: params.visualPrintAreaAspectRatio,
    logoAspectRatio: params.logoAspectRatio,
  });
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

function findProductPriceTier(params: {
  prices: ProductEditorPrice[];
  selectedVariantId: string | null;
  quantity: number;
}): ProductEditorPrice | null {
  const variantPrices = params.selectedVariantId
    ? params.prices.filter(
        (price) => price.variant_id === params.selectedVariantId,
      )
    : [];

  const productPrices = params.prices.filter((price) => !price.variant_id);

  const activePrices =
    variantPrices.length > 0
      ? variantPrices
      : productPrices.length > 0
        ? productPrices
        : params.prices;

  const sortedPrices = [...activePrices].sort(
    (a, b) => a.quantity_min - b.quantity_min,
  );

  const matchingPrice = sortedPrices.find((price) => {
    const minMatches = params.quantity >= price.quantity_min;
    const maxMatches =
      price.quantity_max === null || params.quantity <= price.quantity_max;

    return minMatches && maxMatches;
  });

  if (matchingPrice) {
    return matchingPrice;
  }

  const fallbackPrice = sortedPrices
    .filter((price) => params.quantity >= price.quantity_min)
    .at(-1);

  return fallbackPrice ?? sortedPrices[0] ?? null;
}

export default function ProductCustomizationEditor({
  productId,
  supplierId,
  productName,
  productSlug,
  productImageUrl,
  variants,
  locations,
  productPrices,
  initialDraftId,
  initialVariantId,
  initialLocationId,
  initialQuantity = 1,
}: ProductCustomizationEditorProps) {
  const router = useRouter();

  const printAreaRef = useRef<HTMLDivElement | null>(null);
  const productPrintAreaRef = useRef<HTMLDivElement | null>(null);

  const dragStateRef = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
    area: "editor" | "product";
  } | null>(null);

  const [isSavingDraft, startSavingDraft] = useTransition();

  const selectedColor = useMemo(
    () =>
      variants.find((variant) => variant.id === initialVariantId) ??
      variants[0] ??
      null,
    [initialVariantId, variants],
  );

  const quantity = Math.max(1, initialQuantity);

  const allLocationGroups = useMemo(
    () =>
      buildLocationGroups({
        locations,
        selectedVariantId: selectedColor?.id ?? initialVariantId ?? null,
      }),
    [initialVariantId, locations, selectedColor?.id],
  );

  const componentGroups = useMemo(
    () => buildComponentGroups(allLocationGroups),
    [allLocationGroups],
  );

  const initialComponentId = useMemo(() => {
    const initialGroup = initialLocationId
      ? allLocationGroups.find((group) =>
          group.options.some(
            (option) =>
              option.source_location_id === initialLocationId ||
              option.id === initialLocationId,
          ),
        )
      : null;

    const initialComponent = initialGroup
      ? componentGroups.find((component) =>
          component.sourceIds.includes(initialGroup.componentId),
        )
      : null;

    return initialComponent?.id ?? componentGroups[0]?.id ?? null;
  }, [allLocationGroups, componentGroups, initialLocationId]);

  const [selectedComponentId, setSelectedComponentId] = useState<
    string | null
  >(initialComponentId);

  const locationGroups = useMemo(
    () => {
      const selectedComponent = componentGroups.find(
        (component) => component.id === selectedComponentId,
      );

      if (!selectedComponent) {
        return [];
      }

      return allLocationGroups.filter((group) =>
        selectedComponent.sourceIds.includes(group.componentId),
      );
    },
    [allLocationGroups, componentGroups, selectedComponentId],
  );

  const initialGroupId = useMemo(() => {
    if (!initialLocationId) {
      return locationGroups[0]?.id ?? null;
    }

    const group = locationGroups.find((item) =>
      item.options.some(
        (option) =>
          option.source_location_id === initialLocationId ||
          option.id === initialLocationId,
      ),
    );

    return group?.id ?? locationGroups[0]?.id ?? null;
  }, [initialLocationId, locationGroups]);

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(
    initialGroupId,
  );

  const selectedGroup = useMemo(
    () =>
      locationGroups.find((group) => group.id === selectedGroupId) ??
      locationGroups[0] ??
      null,
    [locationGroups, selectedGroupId],
  );

  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    selectedGroup?.options[0]?.id ?? null,
  );

  const selectedLocation = useMemo(
    () =>
      selectedGroup?.options.find(
        (option) => option.id === selectedLocationId,
      ) ??
      selectedGroup?.options[0] ??
      null,
    [selectedGroup, selectedLocationId],
  );

  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoFileName, setLogoFileName] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [logoAspectRatio, setLogoAspectRatio] = useState(3);
  const [previewPrintArea, setPreviewPrintArea] =
    useState<PreviewPrintArea | null>(null);
  const guideImageRef = useRef<HTMLImageElement | null>(null);
  const [guideImageIndex, setGuideImageIndex] = useState(0);
  const [position, setPosition] = useState<LogoPosition>(initialPosition);
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  const [showPriceTable, setShowPriceTable] = useState(false);
  const [showProductionTimes, setShowProductionTimes] = useState(false);
  const [needsDesignHelp, setNeedsDesignHelp] = useState(false);
  const [extraProof, setExtraProof] = useState(false);
  const [nominative, setNominative] = useState(false);
  const [internalReference, setInternalReference] = useState("");
  const [notes, setNotes] = useState("");

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

  const productLogoPosition = previewPrintArea
    ? getVisualLogoPosition({
        position: safePosition,
        physicalPrintAreaAspectRatio: printAreaAspectRatio,
        visualPrintAreaAspectRatio: previewPrintArea.aspectRatio,
        logoAspectRatio,
      })
    : safePosition;

  const productLogoHeightPercent = getLogoHeightPercent({
    logoWidthPercent: productLogoPosition.width,
    printAreaAspectRatio:
      previewPrintArea?.aspectRatio ?? printAreaAspectRatio,
    logoAspectRatio,
  });

  const logoWidthMm = roundMoney(
    (safePosition.width / 100) * printAreaDimensions.widthMm,
  );

  const logoHeightMm = roundMoney(
    (logoHeightPercent / 100) * printAreaDimensions.heightMm,
  );

  const productImageCandidates = useMemo(
    () =>
      getProductImageCandidates({
        selectedColor,
        productImageUrl,
      }),
    [selectedColor, productImageUrl],
  );

  const guideImageCandidates = useMemo(
    () => getGuideImageCandidates(selectedLocation),
    [selectedLocation],
  );

  const productBaseImage = productImageCandidates[0] ?? null;
  const previewBaseImage = guideImageCandidates[guideImageIndex] ?? null;
  const browserSafePreviewImage = previewBaseImage
    ? getBrowserSafeImageUrl(previewBaseImage)
    : null;

  const productPriceTier = findProductPriceTier({
    prices: productPrices,
    selectedVariantId: selectedColor?.id ?? null,
    quantity,
  });

  const productUnitPrice = productPriceTier?.final_price ?? 0;
  const productCurrency = productPriceTier?.currency ?? "EUR";
  const productSubtotal = roundMoney(productUnitPrice * quantity);

  const personalizationUnitPrice = getTechniqueEstimatedUnitPrice(
    selectedLocation?.technique ?? null,
  );

  const personalizationSubtotal = roundMoney(
    personalizationUnitPrice * quantity,
  );

  const extrasTotal = roundMoney(
    (needsDesignHelp ? 21 : 0) +
      (extraProof ? 15 : 0) +
      (nominative ? 0.7 * quantity : 0),
  );

  const estimatedTotal = roundMoney(
    productSubtotal + personalizationSubtotal + extrasTotal,
  );

  const productionDays = getEstimatedProductionDays(
    selectedLocation?.technique ?? null,
  );

  useEffect(() => {
    if (
      selectedComponentId &&
      componentGroups.some(
        (component) => component.id === selectedComponentId,
      )
    ) {
      return;
    }

    setSelectedComponentId(componentGroups[0]?.id ?? null);
  }, [componentGroups, selectedComponentId]);

  useEffect(() => {
    if (
      selectedGroupId &&
      locationGroups.some((group) => group.id === selectedGroupId)
    ) {
      return;
    }

    setSelectedGroupId(locationGroups[0]?.id ?? null);
  }, [locationGroups, selectedGroupId]);

  useEffect(() => {
    setSelectedLocationId(selectedGroup?.options[0]?.id ?? null);
  }, [selectedGroup?.id, selectedGroup?.options]);

  useEffect(() => {
    setPosition(
      getCenteredLogoPosition({
        printAreaAspectRatio,
        logoAspectRatio,
      }),
    );
  }, [selectedLocation?.id, printAreaAspectRatio, logoAspectRatio]);

  useEffect(() => {
    setPreviewPrintArea(null);
    setGuideImageIndex(0);
  }, [selectedLocation?.id]);

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

  useEffect(() => {
    const guideImage = guideImageRef.current;

    if (!logoPreviewUrl || !guideImage?.complete || !guideImage.naturalWidth) {
      return;
    }

    detectPreviewPrintAreaFromImage(guideImage);
  }, [logoPreviewUrl]);

  function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      return;
    }

    setLogoFile(file);
    setSaveMessage(null);

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
        const nextLogoAspectRatio = image.naturalWidth / image.naturalHeight;
        setLogoAspectRatio(nextLogoAspectRatio);
        setPosition(
          getCenteredLogoPosition({
            printAreaAspectRatio,
            logoAspectRatio: nextLogoAspectRatio,
          }),
        );
      }
    };

    image.src = objectUrl;
    setLogoPreviewUrl(objectUrl);
  }

  function detectPreviewPrintAreaFromImage(image: HTMLImageElement) {

    if (!image.naturalWidth || !image.naturalHeight) {
      setPreviewPrintArea(null);
      return;
    }

    try {
      const maximumDetectionSize = 900;
      const scale = Math.min(
        1,
        maximumDetectionSize /
          Math.max(image.naturalWidth, image.naturalHeight),
      );
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", {
        willReadFrequently: true,
      });

      if (!context) {
        setPreviewPrintArea(null);
        return;
      }

      canvas.width = width;
      canvas.height = height;
      context.drawImage(image, 0, 0, width, height);

      const pixels = context.getImageData(0, 0, width, height).data;
      let minX = width;
      let minY = height;
      let maxX = -1;
      let maxY = -1;
      let matchingPixels = 0;

      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const index = (y * width + x) * 4;
          const red = pixels[index];
          const green = pixels[index + 1];
          const blue = pixels[index + 2];
          const alpha = pixels[index + 3];

          const isGreenGuide =
            alpha > 100 &&
            green > 95 &&
            green > red * 1.2 &&
            green > blue * 1.12 &&
            green - Math.max(red, blue) > 24;

          if (!isGreenGuide) {
            continue;
          }

          matchingPixels += 1;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }

      let detectedWidth = maxX - minX + 1;
      let detectedHeight = maxY - minY + 1;
      const getGreenEdgeCoverage = () => {
        if (maxX < minX || maxY < minY) return [0, 0, 0, 0];

        const isGreenAt = (x: number, y: number) => {
          const index = (y * width + x) * 4;
          const red = pixels[index];
          const green = pixels[index + 1];
          const blue = pixels[index + 2];
          return (
            pixels[index + 3] > 100 &&
            green > 95 &&
            green > red * 1.2 &&
            green > blue * 1.12 &&
            green - Math.max(red, blue) > 24
          );
        };
        const tolerance = Math.max(
          2,
          Math.round(Math.min(width, height) * 0.004),
        );
        let top = 0;
        let bottom = 0;
        let left = 0;
        let right = 0;

        for (let x = minX; x <= maxX; x += 1) {
          let topFound = false;
          let bottomFound = false;
          for (let offset = -tolerance; offset <= tolerance; offset += 1) {
            topFound ||= isGreenAt(
              x,
              clamp(minY + offset, 0, height - 1),
            );
            bottomFound ||= isGreenAt(
              x,
              clamp(maxY + offset, 0, height - 1),
            );
          }
          if (topFound) top += 1;
          if (bottomFound) bottom += 1;
        }

        for (let y = minY; y <= maxY; y += 1) {
          let leftFound = false;
          let rightFound = false;
          for (let offset = -tolerance; offset <= tolerance; offset += 1) {
            leftFound ||= isGreenAt(
              clamp(minX + offset, 0, width - 1),
              y,
            );
            rightFound ||= isGreenAt(
              clamp(maxX + offset, 0, width - 1),
              y,
            );
          }
          if (leftFound) left += 1;
          if (rightFound) right += 1;
        }

        return [
          top / Math.max(1, detectedWidth),
          bottom / Math.max(1, detectedWidth),
          left / Math.max(1, detectedHeight),
          right / Math.max(1, detectedHeight),
        ];
      };
      const greenEdgeCoverage = getGreenEdgeCoverage();
      let isPlausibleArea =
        matchingPixels >= 12 &&
        detectedWidth >= width * 0.04 &&
        detectedHeight >= height * 0.015 &&
        detectedWidth <= width * 0.8 &&
        detectedHeight <= height * 0.65 &&
        greenEdgeCoverage.every((coverage) => coverage >= 0.08) &&
        greenEdgeCoverage.reduce((sum, coverage) => sum + coverage, 0) >=
          0.65;

      // Procura sempre a moldura branca tracejada. Algumas maquetes também
      // contêm elementos verdes que formam um retângulo plausível, mas que não
      // correspondem à área tracejada onde a arte deve ser colocada.
      {
        const rowCounts = new Array<number>(height).fill(0);
        const columnCounts = new Array<number>(width).fill(0);
        const whiteGuideMask = new Uint8Array(width * height);

        for (let y = Math.floor(height * 0.08); y < height * 0.92; y += 1) {
          for (let x = Math.floor(width * 0.08); x < width * 0.92; x += 1) {
            const index = (y * width + x) * 4;
            const red = pixels[index];
            const green = pixels[index + 1];
            const blue = pixels[index + 2];
            const brightness = (red + green + blue) / 3;
            const colourSpread = Math.max(red, green, blue) - Math.min(red, green, blue);

            if (brightness < 215 || colourSpread > 34) {
              continue;
            }

            let hasDarkNeighbour = false;

            for (let offset = -5; offset <= 5 && !hasDarkNeighbour; offset += 1) {
              const neighbourX = clamp(x + offset, 0, width - 1);
              const neighbourY = clamp(y + offset, 0, height - 1);
              const horizontalIndex = (y * width + neighbourX) * 4;
              const verticalIndex = (neighbourY * width + x) * 4;
              const horizontalBrightness =
                (pixels[horizontalIndex] + pixels[horizontalIndex + 1] + pixels[horizontalIndex + 2]) / 3;
              const verticalBrightness =
                (pixels[verticalIndex] + pixels[verticalIndex + 1] + pixels[verticalIndex + 2]) / 3;

              hasDarkNeighbour =
                horizontalBrightness < brightness - 35 ||
                verticalBrightness < brightness - 35;
            }

            if (hasDarkNeighbour) {
              whiteGuideMask[y * width + x] = 1;
              rowCounts[y] += 1;
              columnCounts[x] += 1;
            }
          }
        }

        const strongestRows = rowCounts
          .map((count, coordinate) => ({ count, coordinate }))
          .filter((item) => item.count >= Math.max(5, width * 0.008))
          .sort((a, b) => b.count - a.count)
          .slice(0, 40);
        const strongestColumns = columnCounts
          .map((count, coordinate) => ({ count, coordinate }))
          .filter((item) => item.count >= Math.max(5, height * 0.008))
          .sort((a, b) => b.count - a.count)
          .slice(0, 40);

        const horizontalEdgeStats = (
          y: number,
          left: number,
          right: number,
        ) => {
          let matches = 0;
          let runs = 0;
          let longestRun = 0;
          let currentRun = 0;
          const edgeLength = Math.max(1, right - left + 1);

          for (let x = left; x <= right; x += 1) {
            let found = false;

            for (let offset = -2; offset <= 2 && !found; offset += 1) {
              const sampleY = clamp(y + offset, 0, height - 1);
              found = whiteGuideMask[sampleY * width + x] === 1;
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

          return {
            coverage: matches / edgeLength,
            runs,
            longestRunRatio: longestRun / edgeLength,
          };
        };

        const verticalEdgeStats = (
          x: number,
          top: number,
          bottom: number,
        ) => {
          let matches = 0;
          let runs = 0;
          let longestRun = 0;
          let currentRun = 0;
          const edgeLength = Math.max(1, bottom - top + 1);

          for (let y = top; y <= bottom; y += 1) {
            let found = false;

            // As linhas laterais das maquetes Stricker podem estar inclinadas
            // devido à perspetiva do produto. A pesquisa tem por isso de usar
            // uma faixa horizontal, e não uma coluna vertical rígida.
            const perspectiveTolerance = Math.max(
              3,
              Math.round(width * 0.035),
            );

            for (
              let offset = -perspectiveTolerance;
              offset <= perspectiveTolerance && !found;
              offset += 1
            ) {
              const sampleX = clamp(x + offset, 0, width - 1);
              found = whiteGuideMask[y * width + sampleX] === 1;
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

          return {
            coverage: matches / edgeLength,
            runs,
            longestRunRatio: longestRun / edgeLength,
          };
        };

        let bestCandidate:
          | { left: number; top: number; right: number; bottom: number; score: number }
          | null = null;

        for (const top of strongestRows) {
          for (const bottom of strongestRows) {
            const candidateHeight = bottom.coordinate - top.coordinate;

            if (candidateHeight < height * 0.05 || candidateHeight > height * 0.45) continue;

            for (const left of strongestColumns) {
              for (const right of strongestColumns) {
                const candidateWidth = right.coordinate - left.coordinate;

                if (candidateWidth < width * 0.05 || candidateWidth > width * 0.55) continue;

                const topStats = horizontalEdgeStats(
                  top.coordinate,
                  left.coordinate,
                  right.coordinate,
                );
                const bottomStats = horizontalEdgeStats(
                  bottom.coordinate,
                  left.coordinate,
                  right.coordinate,
                );
                const leftStats = verticalEdgeStats(
                  left.coordinate,
                  top.coordinate,
                  bottom.coordinate,
                );
                const rightStats = verticalEdgeStats(
                  right.coordinate,
                  top.coordinate,
                  bottom.coordinate,
                );

                const edgeStats = [
                  topStats,
                  bottomStats,
                  leftStats,
                  rightStats,
                ];
                const weakestEdge = Math.min(
                  ...edgeStats.map((edge) => edge.coverage),
                );
                const totalCoverage = edgeStats.reduce(
                  (total, edge) => total + edge.coverage,
                  0,
                );
                const totalRuns = edgeStats.reduce(
                  (total, edge) => total + edge.runs,
                  0,
                );

                // A guia da Stricker é efetivamente tracejada: as arestas
                // horizontais têm vários segmentos separados e as verticais
                // pelo menos dois. Um reflexo, rebordo ou união do produto é
                // normalmente uma linha contínua e não pode ser aceite.
                const hasDashedStructure =
                  topStats.runs >= 3 &&
                  bottomStats.runs >= 3 &&
                  leftStats.runs >= 2 &&
                  rightStats.runs >= 2 &&
                  edgeStats.every((edge) => edge.longestRunRatio < 0.72);

                if (
                  !hasDashedStructure ||
                  weakestEdge < 0.075 ||
                  totalCoverage < 0.52
                ) {
                  continue;
                }

                const relativeArea =
                  (candidateWidth * candidateHeight) / (width * height);
                const score =
                  totalCoverage * 240 +
                  weakestEdge * 160 -
                  // Entre molduras tracejadas válidas, a área de impressão é
                  // a moldura dominante. Penalizar a área fazia o algoritmo
                  // escolher pequenos detalhes brancos acima do tracejado.
                  relativeArea * 520 +
                  totalRuns * 2;

                if (!bestCandidate || score > bestCandidate.score) {
                  bestCandidate = {
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

        if (bestCandidate) {
          // O conteúdo fica no interior da linha tracejada, nunca sobre ela.
          const inset = Math.max(1, Math.round(Math.min(width, height) * 0.002));
          minX = bestCandidate.left + inset;
          minY = bestCandidate.top + inset;
          maxX = bestCandidate.right - inset;
          maxY = bestCandidate.bottom - inset;
          detectedWidth = maxX - minX + 1;
          detectedHeight = maxY - minY + 1;
          isPlausibleArea = true;
        }
      }

      if (!isPlausibleArea) {
        setPreviewPrintArea(null);
        return;
      }

      setPreviewPrintArea({
        left: (minX / width) * 100,
        top: (minY / height) * 100,
        width: (detectedWidth / width) * 100,
        height: (detectedHeight / height) * 100,
        aspectRatio: detectedWidth / Math.max(1, detectedHeight),
      });
    } catch {
      setPreviewPrintArea(null);
    }
  }

  function detectPreviewPrintArea(
    event: SyntheticEvent<HTMLImageElement>,
  ) {
    detectPreviewPrintAreaFromImage(event.currentTarget);
  }

  function handleGuideImageError() {
    setPreviewPrintArea(null);
    setGuideImageIndex((current) => current + 1);
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
    setPosition(
      getCenteredLogoPosition({
        printAreaAspectRatio,
        logoAspectRatio,
      }),
    );
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

  function handleLogoPointerDown(
    event: PointerEvent<HTMLDivElement>,
    area: "editor" | "product" = "editor",
  ) {
    const activeArea = area === "product" ? productPrintAreaRef.current : printAreaRef.current;

    if (!activeArea) {
      return;
    }

    const rect = activeArea.getBoundingClientRect();
    const activePosition = area === "product" ? productLogoPosition : safePosition;
    const logoLeft = rect.left + (activePosition.x / 100) * rect.width;
    const logoTop = rect.top + (activePosition.y / 100) * rect.height;

    dragStateRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - logoLeft,
      offsetY: event.clientY - logoTop,
      area,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleLogoPointerMove(event: PointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const activeArea =
      dragState.area === "product" ? productPrintAreaRef.current : printAreaRef.current;

    if (!activeArea) {
      return;
    }

    const rect = activeArea.getBoundingClientRect();

    const nextX =
      ((event.clientX - rect.left - dragState.offsetX) / rect.width) * 100;

    const nextY =
      ((event.clientY - rect.top - dragState.offsetY) / rect.height) * 100;

    setPosition((current) => {
      if (dragState.area === "product" && previewPrintArea) {
        const visualHeight = getLogoHeightPercent({
          logoWidthPercent: productLogoPosition.width,
          printAreaAspectRatio: previewPrintArea.aspectRatio,
          logoAspectRatio,
        });
        const physicalHeight = getLogoHeightPercent({
          logoWidthPercent: current.width,
          printAreaAspectRatio,
          logoAspectRatio,
        });
        const centreX = nextX + productLogoPosition.width / 2;
        const centreY = nextY + visualHeight / 2;

        return getSafeLogoPosition({
          position: {
            ...current,
            x: centreX - current.width / 2,
            y: centreY - physicalHeight / 2,
          },
          printAreaAspectRatio,
          logoAspectRatio,
        });
      }

      return getSafeLogoPosition({
        position: {
          ...current,
          x: nextX,
          y: nextY,
        },
        printAreaAspectRatio,
        logoAspectRatio,
      });
    });
  }

  function handleLogoPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (dragStateRef.current?.pointerId === event.pointerId) {
      dragStateRef.current = null;
    }
  }

  function handleConfirmCustomization() {
    if (!selectedColor) {
      setSaveMessage("Não foi possível identificar a variante selecionada.");
      return;
    }

    if (!selectedLocation) {
      setSaveMessage("Seleciona uma localização e uma técnica.");
      return;
    }

    if (productUnitPrice <= 0) {
      setSaveMessage(
        "Não foi possível determinar o preço do produto para esta quantidade.",
      );
      return;
    }

    setSaveMessage(null);

    startSavingDraft(async () => {
      const formData = new FormData();

      if (initialDraftId) {
        formData.set("draftId", initialDraftId);
      }

      formData.set("productId", productId);
      formData.set("productSlug", productSlug);
      formData.set("variantId", selectedColor.id);

      formData.set(
        "sourceLocationId",
        selectedLocation.source_location_id,
      );

      formData.set("techniqueName", selectedLocation.technique);

      formData.set(
        "componentName",
        selectedLocation.component_name ?? "",
      );

      formData.set(
        "locationName",
        selectedLocation.location_name ?? "",
      );

      formData.set("tableCode", selectedLocation.table_codes[0] ?? "");
      formData.set("tableCodeOption", "");
      formData.set("serviceCode", "");

      formData.set("quantity", String(quantity));

      formData.set(
        "personalizationUnitPrice",
        String(personalizationUnitPrice),
      );

      formData.set("setupCost", "0");
      formData.set("extrasTotal", String(extrasTotal));

      formData.set(
        "printingWidthMm",
        String(printAreaDimensions.widthMm),
      );

      formData.set(
        "printingHeightMm",
        String(printAreaDimensions.heightMm),
      );

      formData.set("logoPositionX", String(safePosition.x));
      formData.set("logoPositionY", String(safePosition.y));
      formData.set("logoScale", String(safePosition.width));
      formData.set("logoRotation", String(safePosition.rotation));
      formData.set("logoWidthMm", String(logoWidthMm));
      formData.set("logoHeightMm", String(logoHeightMm));

      formData.set("needsDesignHelp", String(needsDesignHelp));
      formData.set("extraProof", String(extraProof));
      formData.set("nominative", String(nominative));
      formData.set("internalReference", internalReference);
      formData.set("notes", notes);

      formData.set(
        "technicalPreviewUrl",
        previewBaseImage ?? productBaseImage ?? "",
      );

      formData.set("supplierId", supplierId ?? "");

      if (logoFile) {
        formData.set("logoFile", logoFile);
      }

      const result = await saveCustomizationDraftAction(formData);

      if (!result.success || !result.redirectUrl) {
        setSaveMessage(result.message);
        return;
      }

      router.push(result.redirectUrl);
      router.refresh();
    });
  }

  if (locations.length === 0 || locationGroups.length === 0) {
    return (
      <section className="mt-8 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
          Personalização
        </p>

        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950">
          Maquete indisponível para este produto
        </h2>

        <div className="mt-6 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-6 text-sm leading-6 text-neutral-600">
          A nossa equipa pode analisar este produto e confirmar a melhor solução
          de personalização.
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="mt-8 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="grid gap-8 xl:grid-cols-[300px_minmax(0,1fr)_380px]">
          <aside className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-sm font-semibold text-neutral-950">
              Componente
            </p>

            <div className="mt-4 space-y-2">
              {componentGroups.map((component) => {
                const isSelected = component.id === selectedComponentId;

                return (
                  <button
                    key={component.id}
                    type="button"
                    onClick={() => setSelectedComponentId(component.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      isSelected
                        ? "border-neutral-950 bg-white shadow-sm"
                        : "border-transparent bg-white/70 hover:border-neutral-300 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-base font-semibold text-neutral-950">
                        {component.name}
                      </p>

                      {component.isRecommended ? (
                        <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                          Recomendado
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>

            <p className="mt-6 text-sm font-semibold text-neutral-950">
              Localização
            </p>

            <div className="mt-4 max-h-[620px] space-y-2 overflow-y-auto pr-1">
              {locationGroups.map((group) => {
                const isSelected = group.id === selectedGroup?.id;

                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => setSelectedGroupId(group.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      isSelected
                        ? "border-neutral-950 bg-white shadow-sm"
                        : "border-transparent bg-white/70 hover:border-neutral-300 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-neutral-950">
                          {group.locationName}
                        </p>

                        {group.maxPrintingAreaMm ? (
                          <p className="mt-2 inline-flex items-center text-sm text-neutral-600">
                            <Ruler className="mr-1.5 h-3.5 w-3.5" />
                            {group.maxPrintingAreaMm}
                          </p>
                        ) : null}
                      </div>

                      {group.isRecommended ? (
                        <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                          Recomendada
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="space-y-5">
            <div className="sticky top-28 overflow-hidden rounded-3xl border border-neutral-200 bg-neutral-50">
              <div className="flex min-h-[620px] items-center justify-center bg-white">
                {browserSafePreviewImage ? (
                  <div className="max-w-full p-8">
                    <div className="relative inline-block max-w-full align-middle">
                      <img
                        key={browserSafePreviewImage}
                        ref={guideImageRef}
                        src={browserSafePreviewImage}
                        alt={`Área de personalização ${getLocationLabel(selectedLocation!)}`}
                        onLoad={detectPreviewPrintArea}
                        onError={handleGuideImageError}
                        className="block max-h-[700px] max-w-full object-contain"
                      />

                      {previewPrintArea ? (
                        <div
                          ref={productPrintAreaRef}
                          aria-label="Área máxima de personalização definida pela Stricker"
                          className="pointer-events-none absolute overflow-hidden"
                          style={{
                            left: `${previewPrintArea.left}%`,
                            top: `${previewPrintArea.top}%`,
                            width: `${previewPrintArea.width}%`,
                            height: `${previewPrintArea.height}%`,
                          }}
                        >
                          {logoPreviewUrl ? (
                            <div
                              role="button"
                              tabIndex={0}
                              aria-label="Mover logótipo na área de personalização"
                              onPointerDown={(event) =>
                                handleLogoPointerDown(event, "product")
                              }
                              onPointerMove={handleLogoPointerMove}
                              onPointerUp={handleLogoPointerUp}
                              onPointerCancel={handleLogoPointerUp}
                              className="pointer-events-auto absolute cursor-grab touch-none active:cursor-grabbing"
                              style={{
                                left: `${productLogoPosition.x}%`,
                                top: `${productLogoPosition.y}%`,
                                width: `${productLogoPosition.width}%`,
                                height: `${productLogoHeightPercent}%`,
                                transform: `rotate(${productLogoPosition.rotation}deg)`,
                                transformOrigin: "center center",
                              }}
                            >
                              <img
                                src={logoPreviewUrl}
                                alt="Pré-visualização do logótipo no produto"
                                draggable={false}
                                className="pointer-events-none h-full w-full select-none object-contain"
                              />
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="max-w-xl p-8 text-center">
                    <p className="text-base font-semibold text-neutral-950">
                      Maquete técnica indisponível
                    </p>
                    <p className="mt-2 text-sm leading-6 text-neutral-600">
                      A Stricker não disponibilizou uma imagem com a área de
                      impressão para esta combinação. A posição não será
                      estimada pela loja.
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t border-neutral-200 bg-white p-5">
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-2xl bg-neutral-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                      Técnica
                    </p>

                    <p className="mt-1 font-semibold text-neutral-950">
                      {selectedLocation?.technique ?? "A confirmar"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-neutral-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                      Localização
                    </p>

                    <p className="mt-1 font-semibold text-neutral-950">
                      {selectedLocation
                        ? getLocationLabel(selectedLocation)
                        : "—"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-neutral-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                      Área máxima
                    </p>

                    <p className="mt-1 font-semibold text-neutral-950">
                      {selectedLocation?.max_printing_area_mm ?? "—"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-neutral-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                      Quantidade
                    </p>

                    <p className="mt-1 font-semibold text-neutral-950">
                      {quantity.toLocaleString("pt-PT")} un.
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-xs leading-5 text-neutral-500">
                  A moldura apresentada pertence à maquete técnica fornecida
                  pela Stricker para a localização selecionada. A posição final
                  será validada antes da produção.
                </p>
              </div>
            </div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-neutral-950">
                Produto selecionado
              </p>

              <div className="mt-4 space-y-2 text-sm text-neutral-600">
                <div className="flex justify-between gap-4">
                  <span>Cor / tamanho</span>

                  <span className="text-right font-semibold text-neutral-950">
                    {getColorLabel(selectedColor)}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span>Quantidade</span>

                  <span className="text-right font-semibold text-neutral-950">
                    {quantity.toLocaleString("pt-PT")} un.
                  </span>
                </div>
              </div>

              <Link
                href={`/produto/${productSlug}`}
                className="mt-4 inline-flex text-sm font-semibold text-neutral-950 underline-offset-4 hover:underline"
              >
                Alterar produto
              </Link>
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-neutral-950">
                Técnica de personalização
              </p>

              <div className="mt-4 grid gap-2">
                {selectedGroup?.options.map((option) => {
                  const isSelected = option.id === selectedLocation?.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSelectedLocationId(option.id)}
                      className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                        isSelected
                          ? "border-neutral-950 bg-neutral-950 text-white"
                          : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"
                      }`}
                    >
                      {option.technique}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 rounded-2xl bg-neutral-50 p-4 text-xs leading-5 text-neutral-600">
                Produção estimada:{" "}
                <span className="font-semibold text-neutral-950">
                  {productionDays}
                </span>
              </div>
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-neutral-950">
                Carregar logótipo
              </p>

              <label
                htmlFor="simulator-logo"
                className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-8 text-center transition hover:border-neutral-400 hover:bg-white"
              >
                <Upload className="h-6 w-6 text-neutral-500" />

                <span className="mt-3 text-sm font-semibold text-neutral-950">
                  Carregar ficheiro
                </span>

                <span className="mt-1 text-xs text-neutral-500">
                  SVG, PDF, PNG ou JPG
                </span>
              </label>

              <input
                id="simulator-logo"
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp,application/pdf"
                onChange={handleLogoChange}
                className="sr-only"
              />

              {logoFileName ? (
                <div className="mt-3 rounded-2xl bg-neutral-50 p-3 text-xs leading-5 text-neutral-600">
                  Ficheiro:{" "}
                  <span className="font-semibold text-neutral-950">
                    {logoFileName}
                  </span>
                </div>
              ) : null}
            </div>

            {logoPreviewUrl ? (
              <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-semibold text-neutral-950">
                    Ajustar dentro da área
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

                <div
                  ref={printAreaRef}
                  className="relative mt-5 overflow-hidden rounded-xl border-2 border-dashed border-emerald-500 bg-[linear-gradient(45deg,#f4f4f5_25%,transparent_25%),linear-gradient(-45deg,#f4f4f5_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f4f4f5_75%),linear-gradient(-45deg,transparent_75%,#f4f4f5_75%)] bg-[length:18px_18px] bg-[position:0_0,0_9px,9px_-9px,-9px_0px]"
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
                    <img
                      src={logoPreviewUrl}
                      alt="Logótipo carregado"
                      draggable={false}
                      className="h-full w-full select-none object-contain"
                    />
                  </div>
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
                        onChange={(event) =>
                          updatePosition("x", Number(event.target.value))
                        }
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
                        onChange={(event) =>
                          updatePosition("y", Number(event.target.value))
                        }
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
                        onChange={(event) =>
                          updatePosition("width", Number(event.target.value))
                        }
                        className="mt-3 w-full"
                      />
                    </label>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-neutral-950">
                Extras e observações
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
                  rows={3}
                  className="mt-2 w-full resize-none rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
                />
              </label>
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-neutral-950 p-5 text-white shadow-sm">
              <div className="flex items-center gap-2">
                <Move className="h-5 w-5 text-neutral-300" />

                <p className="text-sm font-semibold">
                  Resumo da personalização
                </p>
              </div>

              <dl className="mt-4 space-y-3 text-sm text-neutral-300">
                <div className="flex justify-between gap-4">
                  <dt>Local</dt>

                  <dd className="text-right text-white">
                    {selectedLocation
                      ? getLocationLabel(selectedLocation)
                      : "—"}
                  </dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt>Técnica</dt>

                  <dd className="text-right text-white">
                    {selectedLocation?.technique ?? "A confirmar"}
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
                    <dt>Quantidade</dt>

                    <dd className="text-right text-white">
                      {quantity.toLocaleString("pt-PT")} un.
                    </dd>
                  </div>

                  <div className="mt-2 flex justify-between gap-4">
                    <dt>Produto / un.</dt>

                    <dd className="text-right text-white">
                      {formatPrice(productUnitPrice, productCurrency)}
                    </dd>
                  </div>

                  <div className="mt-2 flex justify-between gap-4">
                    <dt>Subtotal produto</dt>

                    <dd className="text-right text-white">
                      {formatPrice(productSubtotal, productCurrency)}
                    </dd>
                  </div>

                  <div className="mt-2 flex justify-between gap-4">
                    <dt>Personalização / un.</dt>

                    <dd className="text-right text-white">
                      {formatPrice(personalizationUnitPrice, productCurrency)}
                    </dd>
                  </div>

                  <div className="mt-2 flex justify-between gap-4">
                    <dt>Subtotal personalização</dt>

                    <dd className="text-right text-white">
                      {formatPrice(personalizationSubtotal, productCurrency)}
                    </dd>
                  </div>

                  <div className="mt-2 flex justify-between gap-4">
                    <dt>Extras</dt>

                    <dd className="text-right text-white">
                      {formatPrice(extrasTotal, productCurrency)}
                    </dd>
                  </div>

                  <div className="mt-4 border-t border-white/10 pt-4">
                    <div className="flex justify-between gap-4 text-base">
                      <dt className="font-semibold text-white">
                        Total estimado
                      </dt>

                      <dd className="font-semibold text-white">
                        {formatPrice(estimatedTotal, productCurrency)}
                      </dd>
                    </div>

                    <p className="mt-1 text-xs text-neutral-400">
                      Produto + personalização + extras
                    </p>
                  </div>
                </div>
              </dl>

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setShowPriceTable(true)}
                  className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  Ver preços
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
                A nossa equipa confirma técnica, área e preço final antes da
                produção.
              </div>

              {saveMessage ? (
                <div className="mt-5 rounded-2xl bg-red-500/15 px-4 py-3 text-sm leading-6 text-red-100 ring-1 ring-inset ring-red-400/20">
                  {saveMessage}
                </div>
              ) : null}

              <button
                type="button"
                onClick={handleConfirmCustomization}
                disabled={isSavingDraft}
                className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-white px-5 py-4 text-sm font-semibold !text-neutral-950 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="!text-neutral-950">
                  {isSavingDraft
                    ? "A confirmar maquete..."
                    : "Confirmar maquete e avançar para checkout"}
                </span>

                <ArrowRight className="ml-2 h-4 w-4 !text-neutral-950" />
              </button>
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
                  Técnica: {selectedLocation?.technique ?? "A confirmar"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowPriceTable(false)}
                aria-label="Fechar tabela de preços"
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
                          productCurrency,
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
                aria-label="Fechar tempos de produção"
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
                Os tempos podem variar consoante técnica, disponibilidade,
                dimensão da personalização e validação da maquete.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function buildComponentGroups(
  locationGroups: LocationGroup[],
): ComponentGroup[] {
  const components = new Map<string, ComponentGroup>();

  for (const group of locationGroups) {
    const name = group.componentName?.trim() || "Produto";
    const key = name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-PT");
    const existing = components.get(key);

    if (!existing) {
      components.set(key, {
        id: key,
        name,
        sourceIds: [group.componentId],
        isRecommended: group.isRecommended,
      });
      continue;
    }

    if (!existing.sourceIds.includes(group.componentId)) {
      existing.sourceIds.push(group.componentId);
    }

    if (group.isRecommended) {
      existing.isRecommended = true;
    }
  }

  return Array.from(components.values()).sort((a, b) => {
    if (a.isRecommended && !b.isRecommended) {
      return -1;
    }

    if (!a.isRecommended && b.isRecommended) {
      return 1;
    }

    return a.name.localeCompare(b.name, "pt-PT");
  });
}
