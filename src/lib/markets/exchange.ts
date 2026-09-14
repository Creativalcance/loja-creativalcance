export type UsdReference = { rate: number; date: string; base: "EUR"; quote: "USD" };
export function parseEcbUsd(xml: string, now = Date.now()): UsdReference | null {
  const date = xml.match(/<Cube\s+time=['"](\d{4}-\d{2}-\d{2})['"]/i)?.[1];
  const rateText = xml.match(/<Cube\s+currency=['"]USD['"]\s+rate=['"]([\d.]+)['"]/i)?.[1];
  if (!date || !rateText) return null;
  const dateMs = Date.parse(`${date}T00:00:00Z`);
  const rate = Number(rateText);
  if (!Number.isFinite(dateMs) || new Date(dateMs).toISOString().slice(0, 10) !== date) return null;
  if (dateMs > now || now - dateMs > 7 * 86400000 || !Number.isFinite(rate) || rate <= 0) return null;
  return { rate, date, base: "EUR", quote: "USD" };
}
