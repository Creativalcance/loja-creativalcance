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
import CustomizationLocationImage from "@/components/product/CustomizationLocationImage";
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
  technique: string;
  component_name: string | null;
  location_name: string | null;
  preview_image_url: string | null;
  preview_image_urls: string[];
  location_image_url: string | null;
  area_image_url: string | null;
  printing_lines_image_url: string | null;
  max_printing_area_mm: string | null;
  max_area_cm2: number | null;
  table_codes: string[];
  is_recommended: boolean;
  price_tiers: ProductEditorCustomizationPrice[];
};

export type ProductEditorCustomizationPrice = {
  id: string;
  table_code: string;
  table_code_option: string | null;
  quantity_min: number;
  quantity_max: number | null;
  supplier_price: number;
  final_price: number;
  handling_cost: number;
  supplier_handling_cost: number;
  handling_cost_code: string | null;
  currency: string;
  price_by_area: boolean;
  area_cm2: number | null;
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

type LocationGroup = {
  id: string;
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
    location.source_location_id,
    location.location_name ?? "local",
    location.component_name ?? "componente",
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

function getPreferredPreviewImage(params: {
  selectedLocation: ProductEditorLocation | null;
  selectedColor: ProductEditorVariant | null;
  productImageUrl: string | null;
}): string | null {
  return (
    params.selectedLocation?.printing_lines_image_url ??
    params.selectedLocation?.area_image_url ??
    params.selectedLocation?.location_image_url ??
    params.selectedLocation?.preview_image_url ??
    params.selectedColor?.image_url ??
    params.productImageUrl
  );
}

function findCustomizationPriceTier(
  tiers: ProductEditorCustomizationPrice[],
  quantity: number,
  areaCm2?: number | null,
): ProductEditorCustomizationPrice | null {
  const requestedArea = areaCm2 && areaCm2 > 0 ? areaCm2 : null;
  const series = new Map<string, ProductEditorCustomizationPrice[]>();

  for (const tier of tiers) {
    const key = tier.table_code_option ?? tier.table_code;
    const current = series.get(key) ?? [];

    current.push(tier);
    series.set(key, current);
  }

  const candidates = [...series.entries()].map(([key, prices]) => {
    const areas = prices
      .filter((price) => price.price_by_area && price.area_cm2 !== null)
      .map((price) => price.area_cm2 as number);
    const seriesArea = areas.length > 0 ? Math.max(...areas) : null;
    const colorMatch = key.match(/-(\d+)$/);
    const colors = colorMatch ? Number(colorMatch[1]) : null;

    return {
      key,
      prices,
      seriesArea,
      colors: colors && Number.isFinite(colors) ? colors : null,
    };
  });

  const areaCandidates = requestedArea
    ? candidates.filter(
        (candidate) =>
          candidate.seriesArea === null ||
          candidate.seriesArea >= requestedArea,
      )
    : candidates;
  const applicableCandidates =
    areaCandidates.length > 0 ? areaCandidates : candidates;
  const selectedSeries = [...applicableCandidates].sort((a, b) => {
    const aArea = a.seriesArea ?? Number.POSITIVE_INFINITY;
    const bArea = b.seriesArea ?? Number.POSITIVE_INFINITY;

    if (aArea !== bArea) {
      return aArea - bArea;
    }

    const aColors = a.colors ?? Number.POSITIVE_INFINITY;
    const bColors = b.colors ?? Number.POSITIVE_INFINITY;

    if (aColors !== bColors) {
      return aColors - bColors;
    }

    return a.key.localeCompare(b.key);
  })[0];

  const sorted = [...(selectedSeries?.prices ?? [])].sort((a, b) => {
    if (a.quantity_min !== b.quantity_min) {
      return a.quantity_min - b.quantity_min;
    }

    const aMax = a.quantity_max ?? Number.POSITIVE_INFINITY;
    const bMax = b.quantity_max ?? Number.POSITIVE_INFINITY;

    return aMax - bMax;
  });

  return (
    sorted
      .filter(
        (tier) =>
          quantity >= tier.quantity_min &&
          (tier.quantity_max === null || quantity <= tier.quantity_max),
      )
      .at(-1) ??
    sorted.filter((tier) => quantity >= tier.quantity_min).at(-1) ??
    sorted[0] ??
    null
  );
}

function getCustomizationQuantityBreaks(params: {
  tiers: ProductEditorCustomizationPrice[];
  areaCm2?: number | null;
}): number[] {
  const quantities = new Set<number>();

  for (const tier of params.tiers) {
    if (tier.quantity_min > 0) {
      quantities.add(tier.quantity_min);
    }
  }

  return [...quantities]
    .sort((a, b) => a - b)
    .filter((quantity, index, allQuantities) => {
      const tier = findCustomizationPriceTier(
        params.tiers,
        quantity,
        params.areaCm2,
      );

      if (!tier) {
        return false;
      }

      if (index === 0) {
        return true;
      }

      const previousTier = findCustomizationPriceTier(
        params.tiers,
        allQuantities[index - 1],
        params.areaCm2,
      );

      return (
        !previousTier ||
        tier.final_price !== previousTier.final_price ||
        tier.handling_cost !== previousTier.handling_cost
      );
    });
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

  const dragStateRef = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const [isSavingDraft, startSavingDraft] = useTransition();

  const selectedColor = useMemo(
    () =>
      variants.find((variant) => variant.id === initialVariantId) ??
      variants[0] ??
      null,
    [initialVariantId, variants],
  );

  const [quantity, setQuantity] = useState(Math.max(1, initialQuantity));

  const locationGroups = useMemo(
    () =>
      buildLocationGroups({
        locations,
        selectedVariantId: selectedColor?.id ?? initialVariantId ?? null,
      }),
    [initialVariantId, locations, selectedColor?.id],
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

  const logoWidthMm = roundMoney(
    (safePosition.width / 100) * printAreaDimensions.widthMm,
  );

  const logoHeightMm = roundMoney(
    (logoHeightPercent / 100) * printAreaDimensions.heightMm,
  );

  const previewBaseImage = getPreferredPreviewImage({
    selectedLocation,
    selectedColor,
    productImageUrl,
  });

  const productPriceTier = findProductPriceTier({
    prices: productPrices,
    selectedVariantId: selectedColor?.id ?? null,
    quantity,
  });

  const productUnitPrice = productPriceTier?.final_price ?? 0;
  const productCurrency = productPriceTier?.currency ?? "EUR";
  const productSubtotal = roundMoney(productUnitPrice * quantity);

  const personalizationPriceTier = findCustomizationPriceTier(
    selectedLocation?.price_tiers ?? [],
    quantity,
    logoWidthMm && logoHeightMm ? (logoWidthMm * logoHeightMm) / 100 : null,
  );
  const personalizationUnitPrice =
    personalizationPriceTier?.final_price ?? 0;
  const setupCost = personalizationPriceTier?.handling_cost ?? 0;

  const customizationQuantityBreaks = useMemo(
    () =>
      getCustomizationQuantityBreaks({
        tiers: selectedLocation?.price_tiers ?? [],
        areaCm2:
          logoWidthMm && logoHeightMm
            ? (logoWidthMm * logoHeightMm) / 100
            : null,
      }),
    [logoHeightMm, logoWidthMm, selectedLocation?.price_tiers],
  );

  const nextSavingTier = (() => {
    if (!personalizationPriceTier || personalizationUnitPrice <= 0) {
      return null;
    }

    for (const tierQuantity of customizationQuantityBreaks) {
      if (tierQuantity <= quantity) {
        continue;
      }

      const tier = findCustomizationPriceTier(
        selectedLocation?.price_tiers ?? [],
        tierQuantity,
        logoWidthMm && logoHeightMm
          ? (logoWidthMm * logoHeightMm) / 100
          : null,
      );

      if (tier && tier.final_price < personalizationUnitPrice) {
        return {
          quantity: tierQuantity,
          unitPrice: tier.final_price,
          savingPercentage: Math.round(
            ((personalizationUnitPrice - tier.final_price) /
              personalizationUnitPrice) *
              100,
          ),
        };
      }
    }

    return null;
  })();

  const personalizationSubtotal = roundMoney(
    personalizationUnitPrice * quantity,
  );

  const extrasTotal = roundMoney(
    (needsDesignHelp ? 21 : 0) +
      (extraProof ? 15 : 0) +
      (nominative ? 0.7 * quantity : 0),
  );

  const estimatedTotal = roundMoney(
    productSubtotal + personalizationSubtotal + setupCost + extrasTotal,
  );

  const productionDays = getEstimatedProductionDays(
    selectedLocation?.technique ?? null,
  );

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
    setPosition(initialPosition);
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

      formData.set("tableCode", personalizationPriceTier?.table_code ?? "");
      formData.set(
        "tableCodeOption",
        personalizationPriceTier?.table_code_option ?? "",
      );
      formData.set("serviceCode", "");

      formData.set("quantity", String(quantity));

      formData.set(
        "personalizationUnitPrice",
        String(personalizationUnitPrice),
      );

      formData.set("setupCost", String(setupCost));
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
        previewBaseImage ?? "",
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
        <div className="grid gap-8 xl:grid-cols-[520px_minmax(0,1fr)_380px]">
          <aside className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-neutral-950">
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
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="break-words text-base font-semibold text-neutral-950">
                              {group.locationName}
                            </p>

                            {group.componentName ? (
                              <p className="mt-2 break-words text-sm text-neutral-600">
                                {group.componentName}
                              </p>
                            ) : null}

                            {group.maxPrintingAreaMm ? (
                              <p className="mt-2 inline-flex items-center text-sm text-neutral-600">
                                <Ruler className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                                {group.maxPrintingAreaMm}
                              </p>
                            ) : null}
                          </div>

                          {group.isRecommended ? (
                            <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                              Recomendada
                            </span>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="min-w-0 border-t border-neutral-200 pt-4 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                <p className="text-sm font-semibold text-neutral-950">
                  Tipo de personalização
                </p>

                <div className="mt-4 max-h-[620px] space-y-2 overflow-y-auto pr-1">
                  {(selectedGroup?.options ?? []).map((option) => {
                    const isSelected = option.id === selectedLocation?.id;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setSelectedLocationId(option.id)}
                        className={`w-full rounded-2xl border p-4 text-left transition ${
                          isSelected
                            ? "border-neutral-950 bg-white shadow-sm"
                            : "border-transparent bg-white/70 hover:border-neutral-300 hover:bg-white"
                        }`}
                      >
                        <p className="break-words text-base font-semibold text-neutral-950">
                          {option.technique}
                        </p>

                        {option.max_printing_area_mm ? (
                          <p className="mt-2 inline-flex items-center text-sm text-neutral-600">
                            <Ruler className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                            {option.max_printing_area_mm}
                          </p>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>

          <div className="space-y-5">
            <div className="sticky top-28 overflow-hidden rounded-3xl border border-neutral-200 bg-neutral-50">
              <div className="flex min-h-[620px] items-center justify-center bg-white">
                <CustomizationLocationImage
                  urls={
                    selectedLocation
                      ? [
                          ...(selectedLocation.preview_image_urls ?? []),
                          selectedLocation.preview_image_url,
                          selectedLocation.printing_lines_image_url,
                          selectedLocation.area_image_url,
                        ]
                      : [
                          previewBaseImage,
                          selectedColor?.image_url,
                          productImageUrl,
                        ]
                  }
                  alt={`${productName} — ${selectedLocation?.technique ?? "personalização"}`}
                  className="max-h-[700px] w-full object-contain p-8"
                />
              </div>

              <div className="border-t border-neutral-200 bg-white p-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                  A imagem mostra a zona técnica enviada pelo fornecedor. A
                  posição final será validada antes da produção.
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
                Opção selecionada
              </p>

              <div className="mt-4 rounded-2xl bg-neutral-950 px-4 py-3 text-sm text-white">
                <p className="font-semibold">
                  {selectedLocation?.technique ?? "A confirmar"}
                </p>
                <p className="mt-1 text-xs text-neutral-300">
                  {selectedLocation
                    ? getLocationLabel(selectedLocation)
                    : "Localização a confirmar"}
                  {selectedLocation?.max_printing_area_mm
                    ? ` · ${selectedLocation.max_printing_area_mm}`
                    : ""}
                </p>
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

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400">
                  Personalização para {quantity.toLocaleString("pt-PT")} {" "}
                  {quantity === 1 ? "unidade" : "unidades"}
                </p>

                <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-2xl font-semibold text-white">
                    {formatPrice(personalizationUnitPrice, productCurrency)}
                    <span className="ml-1 text-sm font-medium text-neutral-300">
                      /un.
                    </span>
                  </p>

                  <button
                    type="button"
                    onClick={() => setShowPriceTable(true)}
                    className="text-xs font-semibold text-white underline decoration-white/40 underline-offset-4 transition hover:decoration-white"
                  >
                    Ver todos os preços
                  </button>
                </div>

                <p className="mt-2 text-xs leading-5 text-neutral-300">
                  O preço unitário da personalização diminui com a quantidade
                  selecionada.
                </p>

                {nextSavingTier ? (
                  <button
                    type="button"
                    onClick={() => setQuantity(nextSavingTier.quantity)}
                    className="mt-3 w-full rounded-xl bg-emerald-400/15 px-3 py-3 text-left ring-1 ring-inset ring-emerald-300/20 transition hover:bg-emerald-400/20"
                  >
                    <span className="block text-xs text-emerald-100">
                      A partir de {nextSavingTier.quantity.toLocaleString("pt-PT")} unidades
                    </span>
                    <span className="mt-1 block text-sm font-semibold text-white">
                      {formatPrice(nextSavingTier.unitPrice, productCurrency)}
                      /un. · poupa {nextSavingTier.savingPercentage}% por unidade
                    </span>
                  </button>
                ) : null}

                {customizationQuantityBreaks.length > 1 ? (
                  <div className="mt-4">
                    <p className="text-xs font-medium text-neutral-300">
                      Comparar quantidades
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {customizationQuantityBreaks.map((tierQuantity) => (
                        <button
                          key={tierQuantity}
                          type="button"
                          onClick={() => setQuantity(tierQuantity)}
                          aria-pressed={quantity === tierQuantity}
                          className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                            quantity === tierQuantity
                              ? "bg-white text-neutral-950"
                              : "bg-white/10 text-white hover:bg-white/15"
                          }`}
                        >
                          {tierQuantity.toLocaleString("pt-PT")}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
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
                    <dt>Setup (único)</dt>

                    <dd className="text-right text-white">
                      {formatPrice(setupCost, productCurrency)}
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
                      Produto + personalização + setup + extras
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

                    {customizationQuantityBreaks.map((item) => (
                      <th
                        key={item}
                        className="border-b border-neutral-200 px-4 py-3 text-right font-semibold text-neutral-950"
                      >
                        {item.toLocaleString("pt-PT")}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  <tr>
                    <td className="border-b border-neutral-100 px-4 py-3 font-medium text-neutral-500">
                      Preço / un.
                    </td>

                    {customizationQuantityBreaks.map((item) => (
                      <td
                        key={item}
                        className="border-b border-neutral-100 px-4 py-3 text-right font-semibold text-neutral-950"
                      >
                        {formatPrice(
                          findCustomizationPriceTier(
                            selectedLocation?.price_tiers ?? [],
                            item,
                            logoWidthMm && logoHeightMm
                              ? (logoWidthMm * logoHeightMm) / 100
                              : null,
                          )?.final_price ?? 0,
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
