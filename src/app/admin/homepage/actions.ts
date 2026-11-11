"use server";
import { revalidatePath, updateTag } from "next/cache";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { homepageSchema, HOMEPAGE_CACHE_TAG } from "@/lib/homepage/config";

export type HomepageProductOption = { id: string; name: string; sku: string; status: string; is_purchasable: boolean };
export async function searchHomepageProductsAction(query: string): Promise<{ success: boolean; message: string; products: HomepageProductOption[] }> {
  await assertAdminAccess("/admin/homepage");
  const search = typeof query === "string" ? query.trim() : "";
  if (search.length < 2 || search.length > 100) return { success: false, message: "Escreve entre 2 e 100 caracteres para pesquisar.", products: [] };
  const pattern = "%" + search.replace(/[\\%_]/g, "\\$&") + "%";
  const admin = createSupabaseAdminClient();
  const results = await Promise.all(["name", "sku"].map(field => admin.from("products")
    .select("id,name,sku,status,is_purchasable").eq("status", "active").eq("is_active", true)
    .eq("is_purchasable", true).is("deleted_at", null).ilike(field, pattern).order("name").limit(15)));
  if (results.some(result => result.error)) return { success: false, message: "Não foi possível pesquisar os produtos. Tenta novamente.", products: [] };
  const products = [...new Map(results.flatMap(result => result.data ?? []).map(product => [product.id, product])).values()].slice(0, 20);
  return { success: true, message: products.length ? "" : "Não foram encontrados produtos publicados e disponíveis.", products };
}

export async function saveHomepageAction(raw: string, expectedVersion: number): Promise<{ success: boolean; message: string; version?: number }> {
  const { userId } = await assertAdminAccess("/admin/homepage");
  if (typeof raw !== "string" || raw.length > 50000 || !Number.isSafeInteger(expectedVersion) || expectedVersion < 1)
    return { success: false, message: "Os dados da homepage são inválidos. Atualiza a página." };
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return { success: false, message: "Não foi possível ler a configuração." }; }
  const parsed = homepageSchema.safeParse(value);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0].message };
  const admin = createSupabaseAdminClient();
  const ids = parsed.data.campaign.productIds;
  if (ids.length) {
    const { data, error } = await admin.from("products").select("id").in("id", ids)
      .eq("status", "active").eq("is_active", true).eq("is_purchasable", true).is("deleted_at", null);
    if (error) return { success: false, message: "Não foi possível confirmar os produtos selecionados." };
    if (data.length !== ids.length) return { success: false, message: "Há produtos selecionados que já não estão publicados ou disponíveis. Remove-os da seleção antes de guardar." };
  }
  const { data, error } = await admin.from("homepage_settings").update({
    config: parsed.data, version: expectedVersion + 1, updated_at: new Date().toISOString(), updated_by: userId,
  }).eq("id", "main").eq("version", expectedVersion).select("version").maybeSingle();
  if (error) return { success: false, message: "Não foi possível publicar. A configuração anterior mantém-se; tenta novamente." };
  if (!data) return { success: false, message: "A homepage foi alterada noutra sessão. Atualiza a página antes de guardar para não substituir essas alterações." };
  updateTag(HOMEPAGE_CACHE_TAG);
  revalidatePath("/", "layout");
  revalidatePath("/admin/homepage");
  return { success: true, message: "Homepage publicada. As alterações já estão disponíveis na loja.", version: data.version };
}
