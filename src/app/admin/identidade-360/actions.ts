"use server";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { readIdentityForm, type IdentityFormState } from "@/lib/catalog-identity/validation";

export async function saveCommercialIdentity(_previous: IdentityFormState, form: FormData): Promise<IdentityFormState> {
  const access = await assertAdminAccess("/admin/identidade-360");
  const parsed = readIdentityForm(form);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Verifica os campos." };
  const value = parsed.data;
  const admin = createSupabaseAdminClient();
  const product = await admin.from("products").select("id").eq("id", value.productId).not("supplier_id", "is", null).is("deleted_at", null).maybeSingle();
  if (product.error || !product.data) return { error: "O produto não está disponível para edição." };
  const saved = await admin.from("product_commercial_identities").update({
    translations: value.translations, review_status: value.reviewStatus, updated_by: access.userId,
  }).eq("product_id", value.productId).eq("version", value.version).select("product_id").maybeSingle();
  if (saved.error) return { error: "Não foi possível guardar. Os dados anteriores foram preservados." };
  if (!saved.data) return { error: "Este registo foi alterado noutro separador. Atualiza a página antes de voltar a gravar." };
  revalidatePath("/admin/identidade-360");
  revalidatePath(`/admin/identidade-360/${value.productId}`);
  return { saved: true };
}
