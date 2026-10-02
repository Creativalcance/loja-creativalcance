import type {
  ProductEditorCustomizationPrice,
  ProductEditorLocation,
} from "@/components/product/ProductCustomizationEditor";

export type EditorCatalog = {
  locations: Array<Omit<ProductEditorLocation, "price_tiers"> & { price_tier_indices: number[] }>;
  prices: ProductEditorCustomizationPrice[];
};

// Prices are repeated across colours and print locations. Transfer each complete
// price/service combination once, without changing the editor's pricing rules.
export function packEditorCatalog(locations: ProductEditorLocation[]): EditorCatalog {
  const prices: ProductEditorCustomizationPrice[] = [];
  const indices = new Map<string, number>();
  return {
    locations: locations.map(({ price_tiers, ...location }) => ({
      ...location,
      price_tier_indices: price_tiers.map((price) => {
        const key = JSON.stringify(price);
        let index = indices.get(key);
        if (index === undefined) {
          index = prices.length;
          indices.set(key, index);
          prices.push(price);
        }
        return index;
      }),
    })),
    prices,
  };
}

export function unpackEditorCatalog(catalog: EditorCatalog): ProductEditorLocation[] {
  return catalog.locations.map(({ price_tier_indices, ...location }) => ({
    ...location,
    price_tiers: price_tier_indices.map((index) => {
      const price = catalog.prices[index];
      if (!price) throw new Error("Tabela de personalização incompleta.");
      return price;
    }),
  }));
}
