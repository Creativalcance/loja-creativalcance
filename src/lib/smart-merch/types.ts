export type SmartMerchSort =
  | "recommended"
  | "lowest_price"
  | "best_value"
  | "highest_impact"
  | "fastest_delivery"
  | "sustainable";

export type SmartQuery = {
  originalText: string;
  quantity: number | null;
  totalBudget: number | null;
  maximumUnitBudget: number | null;
  productTypes: string[];
  categories: string[];
  uses: string[];
  occasions: string[];
  colors: string[];
  materials: string[];
  sustainable: boolean | null;
  features: string[];
  deadline: string | null;
  keywords: string[];
  sort: SmartMerchSort;
};

export type SmartMerchReason = {
  code: "budget" | "stock" | "intent" | "use" | "sustainable" | "deadline";
  label: string;
};

export type SmartMerchResult = {
  id: string;
  sku: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  material: string | null;
  typeName: string | null;
  subtypeName: string | null;
  imageUrl: string | null;
  imageAlt: string;
  isCustomizable: boolean;
  isSustainable: boolean;
  quantity: number;
  minimumOrderQuantity: number;
  unitPrice: number | null;
  productTotal: number | null;
  currency: string;
  variantId: string | null;
  variantSku: string | null;
  variantColor: string | null;
  availableStock: number;
  warehouseCode: "PT" | "CZ";
  estimatedDeliveryDate: string;
  deliveryIncludesPersonalization: boolean;
  matchScore: number;
  reasons: SmartMerchReason[];
  unavailableCriteria: Array<"deadline" | "popularity">;
};

export type SmartMerchSearchResponse = {
  query: SmartQuery;
  results: SmartMerchResult[];
  calculatedUnitBudget: number | null;
  pricingNotice: string;
  deadlineNotice: string | null;
  earliestAvailableDate: string | null;
};
