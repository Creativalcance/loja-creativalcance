export type StrickerRawProduct = {
  id?: string | number;
  product_id?: string | number;
  code?: string;
  sku?: string;
  reference?: string;
  name?: string;
  title?: string;
  description?: string;
  short_description?: string;
  brand?: string;
  material?: string;
  dimensions?: string;
  weight?: string | number;
  category?: string;
  category_id?: string | number;
  images?: StrickerRawImage[];
  variants?: StrickerRawVariant[];
  prices?: StrickerRawPrice[];
  stocks?: StrickerRawStock[];
  printing_techniques?: StrickerRawPrintingTechnique[];
  [key: string]: unknown;
};

export type StrickerRawVariant = {
  id?: string | number;
  variant_id?: string | number;
  code?: string;
  sku?: string;
  reference?: string;
  color?: string;
  color_name?: string;
  color_hex?: string;
  size?: string;
  capacity?: string;
  material?: string;
  barcode?: string;
  [key: string]: unknown;
};

export type StrickerRawImage = {
  url?: string;
  image_url?: string;
  src?: string;
  alt?: string;
  type?: string;
  is_primary?: boolean;
  [key: string]: unknown;
};

export type StrickerRawPrice = {
  quantity_min?: number;
  quantity_max?: number;
  min_qty?: number;
  max_qty?: number;
  price?: number;
  supplier_price?: number;
  currency?: string;
  [key: string]: unknown;
};

export type StrickerRawStock = {
  quantity?: number;
  available_quantity?: number;
  stock?: number;
  warehouse?: string;
  warehouse_code?: string;
  incoming_quantity?: number;
  expected_restock_date?: string;
  [key: string]: unknown;
};

export type StrickerRawPrintingTechnique = {
  id?: string | number;
  technique_id?: string | number;
  name?: string;
  description?: string;
  max_colors?: number;
  supports_full_color?: boolean;
  setup_cost?: number;
  price_per_unit?: number;
  [key: string]: unknown;
};

export type StrickerProductsResponse = {
  products: StrickerRawProduct[];
  total?: number;
  page?: number;
  per_page?: number;
  next_page?: number | null;
};