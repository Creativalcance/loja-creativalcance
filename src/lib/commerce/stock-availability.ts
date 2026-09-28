export type StockRow = { variant_id: string | null; available_quantity: number };
export type FutureStockRow = { variant_id: string | null; expected_date: string; expected_quantity: number };

export function stockBusinessDay(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
}

export function orderableStock(stocks: StockRow[], futureStocks: FutureStockRow[], variantId: string | null, today = stockBusinessDay()): number {
  const available = stocks.filter(s => s.variant_id === variantId)
    .reduce((sum, s) => sum + Math.max(0, Number(s.available_quantity) || 0), 0);
  const incoming = futureStocks.filter(s => s.variant_id === variantId && s.expected_date >= today)
    .reduce((sum, s) => sum + Math.max(0, Number(s.expected_quantity) || 0), 0);
  return available + incoming;
}
