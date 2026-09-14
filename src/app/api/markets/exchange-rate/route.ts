import { parseEcbUsd } from "@/lib/markets/exchange";

// Public reference data only. Never used for prices charged, VAT or refunds.
export async function GET() {
  try {
    const response = await fetch("https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml", {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) throw new Error("ECB unavailable");
    const reference = parseEcbUsd(await response.text());
    if (!reference) throw new Error("Invalid or stale ECB reference");
    return Response.json(reference, { headers: { "Cache-Control": "public, max-age=300" } });
  } catch {
    return Response.json({ error: "reference_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
