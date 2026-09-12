"use server";

import { revalidatePath } from "next/cache";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

function value(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function slugify(input: string): string {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 140);
}

export async function createManualCategoryAction(formData: FormData): Promise<void> {
  await assertAdminAccess("/admin/produtos/novo");
  const name = value(formData, "categoryName");
  const slug = slugify(value(formData, "categorySlug") || name);
  if (name.length < 2 || !slug) throw new Error("Indica um nome de categoria válido.");
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("categories").insert({
    name, slug, description: value(formData, "categoryDescription") || null,
    catalog_source: "manual", supplier_id: null, external_id: null, is_active: true,
  });
  if (error) throw new Error(error.code === "23505" ? "Já existe uma categoria com este nome ou URL." : error.message);
  revalidatePath("/categorias");
  revalidatePath("/admin/produtos/novo");
}

export async function createManualProductAction(formData: FormData): Promise<void> {
  await assertAdminAccess("/admin/produtos/novo");
  const name = value(formData, "name");
  const sku = value(formData, "sku").toUpperCase();
  const slug = slugify(value(formData, "slug") || name);
  const categoryId = value(formData, "categoryId");
  const price = Number(value(formData, "price").replace(",", "."));
  const minimum = Number(value(formData, "minOrderQuantity"));
  const stock = Number(value(formData, "stock"));
  const status = value(formData, "status") === "active" ? "active" : "draft";
  if (name.length < 2 || !sku || !slug || !categoryId) throw new Error("Preenche nome, SKU e categoria.");
  if (!Number.isFinite(price) || price <= 0) throw new Error("Indica um preço unitário válido.");
  if (!Number.isInteger(minimum) || minimum < 1) throw new Error("Indica uma quantidade mínima válida.");
  if (!Number.isInteger(stock) || stock < minimum) throw new Error("O stock deve ser igual ou superior à quantidade mínima.");
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("create_manual_catalog_product", {
    p_product: {
      sku, name, slug,
      short_description: value(formData, "shortDescription") || null,
      description: value(formData, "description") || null,
      brand: value(formData, "brand") || null,
      material: value(formData, "material") || null,
      min_order_quantity: minimum,
      lead_time_days: Number(value(formData, "leadTimeDays")) || null,
      seo_title: value(formData, "seoTitle") || null,
      seo_description: value(formData, "seoDescription") || null,
      status, is_active: status === "active", is_featured: formData.get("featured") === "on",
      is_customizable: false, availability_status: "in_stock_pt", is_purchasable: status === "active",
      catalog_source: "manual", fulfillment_route: "internal_360",
    },
    p_category_id: categoryId, p_price: price,
    p_stock: stock,
    p_image_url: value(formData, "imageUrl") || null,
  });
  if (error || !data) throw new Error(error?.code === "23505" ? "Já existe um produto com este SKU ou URL." : error?.message || "Não foi possível criar o produto.");
  revalidatePath("/");
  revalidatePath("/categorias");
  revalidatePath("/admin/produtos");
  redirect("/admin/produtos");
}

export async function updateProductFeaturedAction(formData: FormData): Promise<void> {
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
    .eq("id", productId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/admin/produtos");
  revalidatePath("/categorias");
}
