"use server";

import { revalidatePath } from "next/cache";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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

