import "server-only";
import type { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizePrintAreaGeometry, supplierPrintAreaGeometry } from "@/lib/orders/artwork-preview";

// Call only after verifying admin access or ownership of the order.
export async function hydrateOrderArtworkGeometry<T extends {
  customization_location_id?: string | null; service_code?: string | null; personalization_data?: unknown;
}>(admin: ReturnType<typeof createSupabaseAdminClient>, items: T[]): Promise<T[]> {
  const missing = items.filter(item => item.customization_location_id && !normalizePrintAreaGeometry((item.personalization_data as Record<string, unknown> | null)?.printAreaGeometry));
  const locations = [...new Set(missing.map(item => item.customization_location_id!))];
  if (!locations.length) return items;
  const [options, areas] = await Promise.all([
    admin.from("product_customization_options").select("location_id,service_code,raw_payload").in("location_id", locations),
    admin.from("product_customization_locations").select("id,raw_payload").in("id", locations),
  ]);
  if (options.error || areas.error) throw new Error("Não foi possível recuperar a área da personalização.");
  return items.map(item => {
    if (!missing.includes(item)) return item;
    const exactOptions = (options.data ?? []).filter(option => option.location_id === item.customization_location_id && item.service_code && option.service_code === item.service_code);
    const payloads = [...exactOptions.map(option => option.raw_payload), areas.data?.find(area => area.id === item.customization_location_id)?.raw_payload];
    const geometry = payloads.map(supplierPrintAreaGeometry).find(Boolean);
    return geometry ? { ...item, personalization_data: { ...(item.personalization_data as Record<string, unknown> | null), printAreaGeometry: geometry } } : item;
  });
}
