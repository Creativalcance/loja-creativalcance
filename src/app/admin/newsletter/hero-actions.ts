"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const MAX_IMAGE_BYTES = 1_500_000;
const BUCKET = "newsletter-assets";
type ImageFile = { name: string; size: number; type: string; arrayBuffer: () => Promise<ArrayBuffer> };

function fail(message: string): never {
  redirect(`/admin/newsletter?heroError=${encodeURIComponent(message)}#campaigns`);
}

function isImageFile(value: FormDataEntryValue | null): value is File & ImageFile {
  return value !== null && typeof value === "object" &&
    "arrayBuffer" in value && typeof value.arrayBuffer === "function" &&
    "size" in value && typeof value.size === "number";
}

function detectImage(bytes: Buffer): { mime: string; extension: string } | null {
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 &&
      bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9) {
    return { mime: "image/jpeg", extension: "jpg" };
  }
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) {
    return { mime: "image/png", extension: "png" };
  }
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") {
    return { mime: "image/webp", extension: "webp" };
  }
  return null;
}

export async function uploadNewsletterHero(formData: FormData): Promise<void> {
  await assertAdminAccess("/admin/newsletter");
  const id = String(formData.get("campaign_id") ?? "");
  const file = formData.get("hero");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    fail("Campanha inválida.");
  }
  if (!isImageFile(file)) {
    console.warn("Newsletter hero: file missing or incompatible", { receivedType: typeof file });
    fail("O ficheiro não chegou ao servidor. Escolhe novamente a imagem.");
  }
  if (file.size < 100 || file.size > MAX_IMAGE_BYTES) {
    console.warn("Newsletter hero: invalid size", { bytes: file.size, mime: file.type });
    fail("A imagem deve ter entre 100 bytes e 1,5 MB.");
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const detected = detectImage(bytes);
  if (!detected) {
    console.warn("Newsletter hero: unsupported image", { mime: file.type, bytes: file.size, extension: file.name.split(".").pop() });
    fail("Formato não suportado. Utiliza JPG, PNG ou WebP (não HEIC).");
  }
  const db = createSupabaseAdminClient();
  const { data: campaign, error: loadError } = await db.from("newsletter_campaigns")
    .select("id").eq("id", id).eq("status", "draft")
    .is("resend_broadcast_id", null).maybeSingle();
  if (loadError || !campaign) fail("Só podes alterar imagens de campanhas em rascunho.");
  const key = `${id}/${crypto.randomUUID()}.${detected.extension}`;
  const { error: uploadError } = await db.storage.from(BUCKET).upload(key, bytes, {
    upsert: false, cacheControl: "31536000", contentType: detected.mime,
  });
  if (uploadError) {
    console.error("Newsletter hero: storage upload failed", { code: uploadError.name });
    fail("Falhou o carregamento no armazenamento. Tenta novamente.");
  }
  const { data } = db.storage.from(BUCKET).getPublicUrl(key);
  const { data: updated, error: saveError } = await db.from("newsletter_campaigns")
    .update({ hero_image_url: data.publicUrl, updated_at: new Date().toISOString() })
    .eq("id", id).eq("status", "draft").is("resend_broadcast_id", null)
    .select("id").maybeSingle();
  if (saveError || !updated) {
    await db.storage.from(BUCKET).remove([key]);
    fail("A campanha foi alterada entretanto. A imagem não foi associada.");
  }
  revalidatePath("/admin/newsletter");
  revalidatePath(`/admin/newsletter/preview/${id}`);
  redirect("/admin/newsletter?heroUploaded=1#campaigns");
}
