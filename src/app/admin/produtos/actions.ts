"use server";

import { revalidatePath } from "next/cache";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  manualProductCommand,
  manualProductData,
  manualProductPrice,
  manualProductLogistics,
} from "@/lib/manual-products/validation";
import { parseProductPhotos, parseProductPhotoSelection } from "@/lib/manual-products/photos";
import { redirect } from "next/navigation";

function value(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 140);
}

export type ManualProductCreationConflict = {
  field: "sku" | "slug";
  name: string;
  deleted: boolean;
  href: string | null;
};
export type ManualProductCreationResult =
  | { success: true }
  | { success: false; message: string; conflicts?: ManualProductCreationConflict[] };

function prepareCreation(formData: FormData) {
  let logistics: ReturnType<typeof manualProductLogistics>;
  let price: number;
  try {
    logistics = manualProductLogistics(formData);
    price = manualProductPrice(value(formData, "price"));
  } catch (error) {
    return { success: false as const, message: error instanceof Error && error.name !== "ZodError"
      ? error.message : "Confirma o preço, o peso, as dimensões e os portes." };
  }
  const parsed = manualProductData.safeParse({
    name: value(formData, "name"),
    sku: value(formData, "sku").toUpperCase(),
    slug: slugify(value(formData, "slug") || value(formData, "name")),
    category_id: value(formData, "categoryId"),
    price,
    minimum: Number(value(formData, "minimum") || value(formData, "minOrderQuantity")),
    stock: value(formData, "stock") ? Number(value(formData, "stock")) : NaN,
    lead_time_days: value(formData, "leadTimeDays") ? Number(value(formData, "leadTimeDays")) : null,
    status: value(formData, "status") === "active" ? "active" : "draft",
    featured: formData.get("featured") === "on",
    image_url: value(formData, "imageUrl"),
    short_description: value(formData, "shortDescription"),
    description: value(formData, "description"),
    brand: value(formData, "brand"),
    material: value(formData, "material"),
    seo_title: value(formData, "seoTitle"),
    seo_description: value(formData, "seoDescription"),
    ...logistics,
  });
  if (!parsed.success) return { success: false as const, message: parsed.error.issues[0].message };
  if (parsed.data.stock < parsed.data.minimum)
    return { success: false as const, message: "O stock deve ser igual ou superior à quantidade mínima." };
  return { success: true as const, data: parsed.data };
}

async function creationIdentityConflicts(sku: string, slug: string): Promise<ManualProductCreationResult> {
  const admin = createSupabaseAdminClient();
  // Separate indexed equality filters avoid interpolating user input into PostgREST expressions.
  const fields = ["sku", "slug"] as const;
  const results = await Promise.all(fields.map(field => admin.from("products")
    .select("id,name,deleted_at,catalog_source,fulfillment_route,supplier_id")
    .eq(field, field === "sku" ? sku : slug).limit(1).maybeSingle()));
  if (results.some(result => result.error))
    return { success: false, message: "Não foi possível verificar o SKU e o URL. Tenta novamente; os dados do formulário mantêm-se." };
  const conflicts: ManualProductCreationConflict[] = [];
  results.forEach((result, index) => {
    const product = result.data;
    if (!product) return;
    const manual = product.catalog_source === "manual" && product.fulfillment_route === "internal_360" && !product.supplier_id;
    conflicts.push({ field: fields[index], name: product.name, deleted: !!product.deleted_at,
      href: manual ? `/admin/produtos/${product.id}` : null });
  });
  if (!conflicts.length) return { success: true };
  return { success: false,
    message: "O SKU ou o URL amigável já pertence a outro registo. Consulta o produto indicado abaixo ou altera o campo em conflito. Os produtos eliminados também reservam estes identificadores.",
    conflicts };
}

// Check before uploading photos; all validation runs again when saving.
export async function validateManualProductCreationAction(formData: FormData): Promise<ManualProductCreationResult> {
  await assertAdminAccess("/admin/produtos/novo");
  const prepared = prepareCreation(formData);
  if (!prepared.success) return prepared;
  return creationIdentityConflicts(prepared.data.sku, prepared.data.slug);
}

export async function createManualProductAction(formData: FormData): Promise<ManualProductCreationResult> {
  const { userId } = await assertAdminAccess("/admin/produtos/novo");
  const prepared = prepareCreation(formData);
  if (!prepared.success) return prepared;
  const product = prepared.data;
  let imageUrls: string[];
  try {
    imageUrls = parseProductPhotos(value(formData, "imageUrls"), process.env.NEXT_PUBLIC_SUPABASE_URL!, userId);
  } catch {
    return { success: false, message: "A seleção de fotografias é inválida. Confirma as fotografias e tenta novamente." };
  }
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("create_manual_catalog_product_with_photos", {
    p_product: {
      sku: product.sku, name: product.name, slug: product.slug,
      short_description: product.short_description || null,
      description: product.description || null,
      brand: product.brand || null, material: product.material || null,
      min_order_quantity: product.minimum,
      weight: product.weight, dimensions: product.dimensions,
      shipping_profile: product.shipping_profile, delivery_unit_price: product.delivery_unit_price,
      lead_time_days: product.lead_time_days,
      seo_title: product.seo_title || null, seo_description: product.seo_description || null,
      status: product.status, is_active: product.status === "active",
      is_featured: product.featured, is_customizable: false,
      availability_status: "in_stock_pt", is_purchasable: product.status === "active",
      catalog_source: "manual", fulfillment_route: "internal_360",
    },
    p_category_id: product.category_id,
    p_price: product.price,
    p_stock: product.stock,
    p_image_url: imageUrls.length ? null : product.image_url || null,
    p_image_urls: imageUrls,
  });
  if (error || !data) {
    if (error?.code === "23505") {
      const conflict = await creationIdentityConflicts(product.sku, product.slug);
      return conflict.success ? { success: false, message: "O SKU ou o URL já está em utilização. Confirma os dados e tenta novamente." } : conflict;
    }
    if (error?.code === "23503" || error?.code === "22023")
      return { success: false, message: "Seleciona uma categoria ativa e confirma os dados do produto." };
    return { success: false, message: "Não foi possível guardar o produto. Os dados e as fotografias mantêm-se no formulário; tenta novamente." };
  }
  revalidatePath("/", "layout");
  revalidatePath("/categorias");
  revalidatePath("/admin/produtos");
  redirect("/admin/produtos");
}

export async function updateProductFeaturedAction(
  formData: FormData,
): Promise<void> {
  await assertAdminAccess("/admin/produtos");

  const productId = String(formData.get("productId") ?? "").trim();
  const featured = String(formData.get("featured") ?? "") === "true";

  if (!productId) {
    throw new Error("Produto inválido.");
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { error } = await supabaseAdmin
    .from("products")
    .update({
      is_featured: featured,
      featured_override: featured,
    })
    .eq("id", productId)
    .is("deleted_at", null);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/admin/produtos");
  revalidatePath("/categorias");
}

export type ManualProductActionState = { success: boolean; message: string };

export async function manageManualProductAction(
  _previous: ManualProductActionState,
  formData: FormData,
): Promise<ManualProductActionState> {
  const { userId } = await assertAdminAccess("/admin/produtos");
  const command = manualProductCommand.safeParse(Object.fromEntries(formData));
  if (!command.success)
    return { success: false, message: command.error.issues[0].message };
  const { productId, expectedVersion, operation } = command.data;
  let data: Record<string, unknown> = {};
  if (operation === "delete" && formData.get("confirmDelete") !== "on") {
    return { success: false, message: "Confirma a eliminação do produto." };
  }
  if (operation === "edit") {
    let price: number;
    let logistics = {};
    try {
      price = manualProductPrice(value(formData, "price"));
      if (formData.has("shipping_profile")) logistics = manualProductLogistics(formData);
    } catch (error) {
      return { success: false, message: (error as Error).message };
    }
    const parsed = manualProductData.safeParse({
      ...Object.fromEntries(formData),
      ...logistics,
      image_url: value(formData, "image_url"),
      price,
      minimum: Number(value(formData, "minimum")),
      stock:
        value(formData, "stock") === ""
          ? NaN
          : Number(value(formData, "stock")),
      lead_time_days: value(formData, "lead_time_days")
        ? Number(value(formData, "lead_time_days"))
        : null,
      featured: formData.get("featured") === "on",
    });
    if (!parsed.success)
      return { success: false, message: parsed.error.issues[0].message };
    data = parsed.data;
    if (formData.has("photos")) {
      try {
        data.photos = parseProductPhotoSelection(value(formData, "photos"), process.env.NEXT_PUBLIC_SUPABASE_URL!, userId);
      } catch (error) {
        return { success: false, message: (error as Error).message };
      }
    }
  } else if (operation === "status") {
    const parsed = manualProductData.shape.status.safeParse(
      value(formData, "status"),
    );
    if (!parsed.success)
      return { success: false, message: "Seleciona um estado válido." };
    data = { status: parsed.data };
  }
  const admin = createSupabaseAdminClient();
  const { error } = await admin.rpc("manage_manual_product", {
    p_actor: userId,
    p_product_id: productId,
    p_action: operation,
    p_expected_updated_at: expectedVersion,
    p_data: data,
  });
  if (error)
    return {
      success: false,
      message:
        error.code === "23505"
          ? "Já existe um produto com este SKU ou URL."
          : error.code === "P0001"
            ? error.message
            : "Não foi possível guardar. Atualiza a página e tenta novamente.",
    };
  // Product data appears in all localized product, category, search and featured pages.
  revalidatePath("/", "layout");
  revalidatePath("/admin/produtos");
  revalidatePath(`/admin/produtos/${productId}`);
  revalidatePath("/admin/precos");
  revalidatePath("/sitemap.xml");
  const messages = {
    edit: "Alterações guardadas.",
    status: "Estado atualizado.",
    delete: "Produto eliminado. Podes restaurá-lo no filtro Eliminados.",
    restore:
      "Produto restaurado como rascunho. Revê os dados antes de publicar.",
  };
  return { success: true, message: messages[operation] };
}
