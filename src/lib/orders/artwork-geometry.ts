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
  const services = [...new Set(missing.map(item => item.service_code).filter((code): code is string => Boolean(code)))];
  // service_code is indexed; querying locations alone scans the entire options catalog.
  // Geometry is optional enrichment: failure must not hide orders or saved artwork.
  const [optionResult, areaResult] = await Promise.allSettled([
    services.length ? admin.from("product_customization_options").select("location_id,service_code,raw_payload").in("service_code", services).in("location_id", locations) : Promise.resolve({ data: [], error: null }),
    admin.from("product_customization_locations").select("id,raw_payload").in("id", locations),
  ]);
  const options = optionResult.status === "fulfilled" && !optionResult.value.error ? optionResult.value.data ?? [] : [];
  const areas = areaResult.status === "fulfilled" && !areaResult.value.error ? areaResult.value.data ?? [] : [];
  for (const [source, result] of [["options", optionResult], ["locations", areaResult]] as const) {
    if (result.status === "rejected" || result.value.error) {
      console.warn("Order artwork geometry lookup unavailable", { source, code: result.status === "fulfilled" ? result.value.error?.code : "request_failed" });
    }
  }
  return items.map(item => {
    if (!missing.includes(item)) return item;
    const exactOptions = options.filter(option => option.location_id === item.customization_location_id && item.service_code && option.service_code === item.service_code);
    const payloads = [...exactOptions.map(option => option.raw_payload), areas.find(area => area.id === item.customization_location_id)?.raw_payload];
    const geometry = payloads.map(supplierPrintAreaGeometry).find(Boolean);
    return geometry ? { ...item, personalization_data: { ...(item.personalization_data as Record<string, unknown> | null), printAreaGeometry: geometry } } : item;
  });
}
