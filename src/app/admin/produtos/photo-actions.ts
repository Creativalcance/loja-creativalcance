"use server";

import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { detectProductPhoto, MAX_PHOTO_BYTES, PRODUCT_PHOTO_BUCKET } from "@/lib/manual-products/photos";

export async function uploadManualProductPhoto(formData: FormData): Promise<{ url?: string; error?: string }> {
  const { userId } = await assertAdminAccess("/admin/produtos/novo");
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_PHOTO_BYTES)
    return { error: "Cada fotografia deve ter até 3 MB." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = detectProductPhoto(bytes);
  if (!detected) return { error: "Formato não suportado. Utiliza JPG, PNG ou WebP." };
  const db = createSupabaseAdminClient();
  const path = `${userId}/${crypto.randomUUID()}.${detected.extension}`;
  const { error } = await db.storage.from(PRODUCT_PHOTO_BUCKET).upload(path, bytes, {
    contentType: detected.mime, cacheControl: "31536000", upsert: false,
  });
  if (error) return { error: "Não foi possível carregar a fotografia. Tenta novamente." };
  return { url: db.storage.from(PRODUCT_PHOTO_BUCKET).getPublicUrl(path).data.publicUrl };
}
