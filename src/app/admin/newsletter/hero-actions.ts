"use server";

import { revalidatePath } from "next/cache";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const MAX_IMAGE_BYTES = 1_500_000;
const BUCKET = "newsletter-assets";

export async function uploadNewsletterHero(formData: FormData): Promise<void> {
  await assertAdminAccess("/admin/newsletter");
  const id = String(formData.get("campaign_id") ?? "");
  const file = formData.get("hero");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error("Campanha inválida.");
  }
  if (!(file instanceof File) || file.type !== "image/jpeg" ||
      file.size < 100 || file.size > MAX_IMAGE_BYTES) {
    throw new Error("Escolhe um ficheiro JPG até 1,5 MB.");
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8 ||
      bytes[bytes.length - 2] !== 0xff || bytes[bytes.length - 1] !== 0xd9) {
    throw new Error("O ficheiro não é um JPG válido.");
  }
  const db = createSupabaseAdminClient();
  const { data: campaign, error: loadError } = await db.from("newsletter_campaigns")
    .select("id,hero_image_url").eq("id", id).eq("status", "draft")
    .is("resend_broadcast_id", null).maybeSingle();
  if (loadError || !campaign) {
    throw new Error("Só podes alterar a imagem de campanhas ainda em rascunho.");
  }
  const key = `${id}/${crypto.randomUUID()}.jpg`;
  const { error: uploadError } = await db.storage.from(BUCKET).upload(key, bytes, {
    upsert: false,
    cacheControl: "31536000",
    contentType: "image/jpeg",
  });
  if (uploadError) throw new Error("Não foi possível carregar a imagem da campanha.");
  const { data } = db.storage.from(BUCKET).getPublicUrl(key);
  const { data: updated, error: saveError } = await db.from("newsletter_campaigns")
    .update({ hero_image_url: data.publicUrl, updated_at: new Date().toISOString() })
    .eq("id", id).eq("status", "draft").is("resend_broadcast_id", null)
    .select("id").maybeSingle();
  if (saveError || !updated) {
    await db.storage.from(BUCKET).remove([key]);
    throw new Error("O rascunho foi entretanto alterado. A imagem não foi associada.");
  }
  revalidatePath("/admin/newsletter");
  revalidatePath(`/admin/newsletter/preview/${id}`);
}
