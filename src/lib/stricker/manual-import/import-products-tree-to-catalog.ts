import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { type JsonRecord } from "@/lib/stricker/types";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

type NormalizedImportRecordRow = {
  id: string;
  supplier_id: string;
  dataset_import_id: string | null;
  manual_import_file_id: string;
  dataset_name: string;
  external_id: string;
  sku: string | null;
  slug: string | null;
  name: string | null;
  normalized_payload: JsonRecord;
  supplier_payload: JsonRecord | null;
};

type ImportedProductRow = {
  id: string;
  external_id: string;
  supplier_id: string;
  sku: string | null;
};

type ImportProductsTreeToCatalogResult = {
  productsImported: number;
  variantsImported: number;
  imagesImported: number;
  categoriesImported: number;
};

type ProductCatalogCategoryRow = {
  supplier_id: string;
  external_id: string;
  parent_external_id: string | null;
  type_code: string | null;
  type_name: string | null;
  subtype_code: string | null;
  subtype_name: string | null;
  language: string;
  is_active: boolean;
  raw_payload: JsonRecord;
};

type ProductUpsertRow = {
  supplier_id: string;
  external_id: string;
  sku: string;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  brand: string | null;
  material: string | null;
  dimensions: string | null;
  weight: number | null;
  country_of_origin: string | null;
  status: string;
  is_active: boolean;
  is_featured: boolean;
  is_customizable: boolean;
  min_order_quantity: number;
  lead_time_days: number | null;
  seo_title: string | null;
  seo_description: string | null;
  supplier_payload: JsonRecord;
  type_code: string | null;
  type_name: string | null;
  subtype_code: string | null;
  subtype_name: string | null;
  taric: string | null;
};

type ProductVariantUpsertRow = {
  product_id: string;
  supplier_id: string;
  external_variant_id: string;
  sku: string;
  color_name: string | null;
  color_hex: string | null;
  size: string | null;
  capacity: string | null;
  material: string | null;
  barcode: string | null;
  is_active: boolean;
  supplier_payload: JsonRecord;
};

type ProductImageInsertRow = {
  product_id: string;
  variant_id: string | null;
  supplier_id: string;
  external_url: string;
  storage_url: string | null;
  alt_text: string | null;
  sort_order: number;
  image_type: string;
  is_primary: boolean;
};

function createSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getString(record: JsonRecord, key: string): string | null {
  const value = record[key];

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function getNumber(record: JsonRecord, key: string): number | null {
  const value = record[key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value.replace(",", ".").replace(/[^\d.-]/g, ""));

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function getBoolean(record: JsonRecord, key: string, fallback: boolean): boolean {
  const value = record[key];

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["true", "1", "yes", "sim", "s"].includes(normalized)) {
      return true;
    }

    if (["false", "0", "no", "não", "nao", "n"].includes(normalized)) {
      return false;
    }
  }

  return fallback;
}

function getInteger(record: JsonRecord, key: string, fallback: number): number {
  const value = getNumber(record, key);

  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(1, Math.round(value ?? fallback));
}

function buildProductRows(
  records: NormalizedImportRecordRow[],
): ProductUpsertRow[] {
  return records.map((record) => {
    const payload = record.normalized_payload;

    const externalId =
      getString(payload, "external_id") ?? record.external_id;

    const sku = getString(payload, "sku") ?? record.sku ?? externalId;
    const name = getString(payload, "name") ?? record.name ?? sku;
    const slug = getString(payload, "slug") ?? createSlug(`${name}-${sku}`);

    const shortDescription = getString(payload, "short_description");
    const description = getString(payload, "description");
    const isActive = getBoolean(payload, "is_active", true);

    return {
      supplier_id: record.supplier_id,
      external_id: externalId,
      sku,
      name,
      slug,
      short_description: shortDescription,
      description,
      brand: getString(payload, "brand"),
      material: getString(payload, "material"),
      dimensions: getString(payload, "dimensions"),
      weight: getNumber(payload, "weight"),
      country_of_origin: getString(payload, "country_of_origin"),
      status: "active",
      is_active: isActive,
      is_featured: getBoolean(payload, "is_featured", false),
      is_customizable: getBoolean(payload, "is_customizable", true),
      min_order_quantity: getInteger(payload, "min_order_quantity", 1),
      lead_time_days: null,
      seo_title: name,
      seo_description: shortDescription ?? description,
      supplier_payload:
        record.supplier_payload && typeof record.supplier_payload === "object"
          ? record.supplier_payload
          : payload,
      type_code: getString(payload, "type_code"),
      type_name: getString(payload, "type_name"),
      subtype_code: getString(payload, "subtype_code"),
      subtype_name: getString(payload, "subtype_name"),
      taric: getString(payload, "taric"),
    };
  });
}

function buildCatalogCategoryRows(
  records: NormalizedImportRecordRow[],
): ProductCatalogCategoryRow[] {
  const categories = new Map<string, ProductCatalogCategoryRow>();

  for (const record of records) {
    const payload = record.normalized_payload;

    const typeCode = getString(payload, "type_code");
    const typeName = getString(payload, "type_name");
    const subtypeCode = getString(payload, "subtype_code");
    const subtypeName = getString(payload, "subtype_name");

    const typeExternalId =
      typeCode || typeName ? `type:${typeCode ?? createSlug(typeName ?? "")}` : null;

    if (typeExternalId) {
      categories.set(`${record.supplier_id}:${typeExternalId}:PT`, {
        supplier_id: record.supplier_id,
        external_id: typeExternalId,
        parent_external_id: null,
        type_code: typeCode,
        type_name: typeName,
        subtype_code: null,
        subtype_name: null,
        language: "PT",
        is_active: true,
        raw_payload: payload,
      });
    }

    if (subtypeCode || subtypeName) {
      const subtypeExternalId = `subtype:${
        typeCode ?? createSlug(typeName ?? "sem-tipo")
      }:${subtypeCode ?? createSlug(subtypeName ?? "")}`;

      categories.set(`${record.supplier_id}:${subtypeExternalId}:PT`, {
        supplier_id: record.supplier_id,
        external_id: subtypeExternalId,
        parent_external_id: typeExternalId,
        type_code: typeCode,
        type_name: typeName,
        subtype_code: subtypeCode,
        subtype_name: subtypeName,
        language: "PT",
        is_active: true,
        raw_payload: payload,
      });
    }
  }

  return Array.from(categories.values());
}

function buildVariantRows(params: {
  records: NormalizedImportRecordRow[];
  products: ImportedProductRow[];
}): ProductVariantUpsertRow[] {
  const productByExternalId = new Map(
    params.products.map((product) => [product.external_id, product]),
  );

  return params.records.flatMap((record) => {
    const payload = record.normalized_payload;
    const externalId = getString(payload, "external_id") ?? record.external_id;
    const product = productByExternalId.get(externalId);

    if (!product) {
      return [];
    }

    const sku = getString(payload, "sku") ?? product.sku ?? externalId;
    const material = getString(payload, "material");

    return [
      {
        product_id: product.id,
        supplier_id: product.supplier_id,
        external_variant_id: `${externalId}-default`,
        sku: `${sku}-DEFAULT`,
        color_name: null,
        color_hex: null,
        size: null,
        capacity: null,
        material,
        barcode: null,
        is_active: getBoolean(payload, "is_active", true),
        supplier_payload: payload,
      },
    ];
  });
}

function buildImageRows(params: {
  records: NormalizedImportRecordRow[];
  products: ImportedProductRow[];
}): ProductImageInsertRow[] {
  const productByExternalId = new Map(
    params.products.map((product) => [product.external_id, product]),
  );

  const images: ProductImageInsertRow[] = [];

  for (const record of params.records) {
    const payload = record.normalized_payload;
    const externalId = getString(payload, "external_id") ?? record.external_id;
    const product = productByExternalId.get(externalId);

    if (!product) {
      continue;
    }

    const mainImageUrl = getString(payload, "main_image_url");
    const boxImageUrl = getString(payload, "box_image_url");
    const name = getString(payload, "name") ?? record.name;

    if (mainImageUrl) {
      images.push({
        product_id: product.id,
        variant_id: null,
        supplier_id: product.supplier_id,
        external_url: mainImageUrl,
        storage_url: null,
        alt_text: name,
        sort_order: 0,
        image_type: "main",
        is_primary: true,
      });
    }

    if (boxImageUrl) {
      images.push({
        product_id: product.id,
        variant_id: null,
        supplier_id: product.supplier_id,
        external_url: boxImageUrl,
        storage_url: null,
        alt_text: name ? `${name} - embalagem` : "Embalagem",
        sort_order: 1,
        image_type: "box",
        is_primary: false,
      });
    }
  }

  return images;
}

async function fetchProductsTreeRecords(params: {
  supabaseAdmin: SupabaseAdminClient;
  manualImportFileId: string;
}): Promise<NormalizedImportRecordRow[]> {
  const { data, error } = await params.supabaseAdmin
    .from("supplier_normalized_import_records")
    .select(
      [
        "id",
        "supplier_id",
        "dataset_import_id",
        "manual_import_file_id",
        "dataset_name",
        "external_id",
        "sku",
        "slug",
        "name",
        "normalized_payload",
        "supplier_payload",
      ].join(","),
    )
    .eq("manual_import_file_id", params.manualImportFileId)
    .eq("dataset_name", "productsTree")
    .returns<NormalizedImportRecordRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function importProductsTreeToCatalog(params: {
  manualImportFileId: string;
}): Promise<ImportProductsTreeToCatalogResult> {
  const supabaseAdmin = createSupabaseAdminClient();

  const records = await fetchProductsTreeRecords({
    supabaseAdmin,
    manualImportFileId: params.manualImportFileId,
  });

  if (records.length === 0) {
    return {
      productsImported: 0,
      variantsImported: 0,
      imagesImported: 0,
      categoriesImported: 0,
    };
  }

  const categoryRows = buildCatalogCategoryRows(records);

  if (categoryRows.length > 0) {
    const { error: categoryError } = await supabaseAdmin
      .from("supplier_catalog_categories")
      .upsert(categoryRows, {
        onConflict: "supplier_id,external_id,language",
      });

    if (categoryError) {
      throw new Error(categoryError.message);
    }
  }

  const productRows = buildProductRows(records);

  const { data: importedProducts, error: productError } = await supabaseAdmin
    .from("products")
    .upsert(productRows, {
      onConflict: "supplier_id,external_id",
    })
    .select("id, external_id, supplier_id, sku")
    .returns<ImportedProductRow[]>();

  if (productError) {
    throw new Error(productError.message);
  }

  const products = importedProducts ?? [];

  const variantRows = buildVariantRows({
    records,
    products,
  });

  if (variantRows.length > 0) {
    const { error: variantError } = await supabaseAdmin
      .from("product_variants")
      .upsert(variantRows, {
        onConflict: "supplier_id,external_variant_id",
      });

    if (variantError) {
      throw new Error(variantError.message);
    }
  }

  const productIds = products.map((product) => product.id);

  if (productIds.length > 0) {
    const { error: deleteImagesError } = await supabaseAdmin
      .from("product_images")
      .delete()
      .in("product_id", productIds)
      .in("image_type", ["main", "box"]);

    if (deleteImagesError) {
      throw new Error(deleteImagesError.message);
    }
  }

  const imageRows = buildImageRows({
    records,
    products,
  });

  if (imageRows.length > 0) {
    const { error: imageError } = await supabaseAdmin
      .from("product_images")
      .insert(imageRows);

    if (imageError) {
      throw new Error(imageError.message);
    }
  }

  const normalizedRecordIds = records.map((record) => record.id);

  const { error: updateRecordsError } = await supabaseAdmin
    .from("supplier_normalized_import_records")
    .update({
      import_status: "imported",
      error_message: null,
    })
    .in("id", normalizedRecordIds);

  if (updateRecordsError) {
    throw new Error(updateRecordsError.message);
  }

  const datasetImportIds = Array.from(
    new Set(
      records
        .map((record) => record.dataset_import_id)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  if (datasetImportIds.length > 0) {
    const { error: updateImportsError } = await supabaseAdmin
      .from("supplier_dataset_imports")
      .update({
        status: "success",
        records_imported: products.length,
        records_failed: 0,
        errors: [],
        finished_at: new Date().toISOString(),
      })
      .in("id", datasetImportIds);

    if (updateImportsError) {
      throw new Error(updateImportsError.message);
    }
  }

  return {
    productsImported: products.length,
    variantsImported: variantRows.length,
    imagesImported: imageRows.length,
    categoriesImported: categoryRows.length,
  };
}