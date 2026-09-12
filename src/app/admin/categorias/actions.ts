"use server";

import { revalidatePath } from "next/cache";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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

export async function createManualCategoryAction(formData: FormData): Promise<void> {
  await assertAdminAccess("/admin/categorias");
  const name = value(formData, "categoryName");
  const slug = slugify(value(formData, "categorySlug") || name);

  if (name.length < 2 || !slug) {
    throw new Error("Indica um nome de categoria válido.");
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("categories").insert({
    name,
    slug,
    description: value(formData, "categoryDescription") || null,
    catalog_source: "manual",
    supplier_id: null,
    external_id: null,
    is_active: true,
  });

  if (error) {
    throw new Error(
      error.code === "23505"
        ? "Já existe uma categoria com este nome ou URL."
        : error.message,
    );
  }

  revalidatePath("/categorias");
  revalidatePath("/admin/categorias");
  revalidatePath("/admin/produtos/novo");
}
