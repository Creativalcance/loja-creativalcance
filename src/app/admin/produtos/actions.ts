"use server";

import { revalidatePath } from "next/cache";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  manualProductCommand,
  manualProductData,
  manualProductPrice,
} from "@/lib/manual-products/validation";
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

export async function createManualProductAction(
  formData: FormData,
): Promise<void> {
  await assertAdminAccess("/admin/produtos/novo");
  const name = value(formData, "name");
  const sku = value(formData, "sku").toUpperCase();
  const slug = slugify(value(formData, "slug") || name);
  const categoryId = value(formData, "categoryId");
  const price = Number(value(formData, "price").replace(",", "."));
  const minimum = Number(value(formData, "minOrderQuantity"));
  const stock = Number(value(formData, "stock"));
  const status = value(formData, "status") === "active" ? "active" : "draft";
  if (name.length < 2 || !sku || !slug || !categoryId)
    throw new Error("Preenche nome, SKU e categoria.");
  if (!Number.isFinite(price) || price <= 0)
    throw new Error("Indica um preço unitário válido.");
  if (!Number.isInteger(minimum) || minimum < 10)
    throw new Error("A quantidade mínima da loja é 10 unidades.");
  if (!Number.isInteger(stock) || stock < minimum)
    throw new Error("O stock deve ser igual ou superior à quantidade mínima.");
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("create_manual_catalog_product", {
    p_product: {
      sku,
      name,
      slug,
      short_description: value(formData, "shortDescription") || null,
      description: value(formData, "description") || null,
      brand: value(formData, "brand") || null,
      material: value(formData, "material") || null,
      min_order_quantity: minimum,
      lead_time_days: Number(value(formData, "leadTimeDays")) || null,
      seo_title: value(formData, "seoTitle") || null,
      seo_description: value(formData, "seoDescription") || null,
      status,
      is_active: status === "active",
      is_featured: formData.get("featured") === "on",
      is_customizable: false,
      availability_status: "in_stock_pt",
      is_purchasable: status === "active",
      catalog_source: "manual",
      fulfillment_route: "internal_360",
    },
    p_category_id: categoryId,
    p_price: price,
    p_stock: stock,
    p_image_url: value(formData, "imageUrl") || null,
  });
  if (error || !data)
    throw new Error(
      error?.code === "23505"
        ? "Já existe um produto com este SKU ou URL."
        : error?.message || "Não foi possível criar o produto.",
    );
  revalidatePath("/");
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
    try {
      price = manualProductPrice(value(formData, "price"));
    } catch (error) {
      return { success: false, message: (error as Error).message };
    }
    const parsed = manualProductData.safeParse({
      ...Object.fromEntries(formData),
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
