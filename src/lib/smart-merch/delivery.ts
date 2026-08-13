export type DeliverySla = {
  table_code_option: string;
  warehouse_code: "PT" | "CZ";
  quantity_min: number;
  quantity_max: number | null;
  production_days: number;
  is_available: boolean;
};

export type FulfillmentSetting = {
  warehouse_code: "PT" | "CZ";
  preparation_business_days: number;
  transport_business_days: number;
};

export function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  let remaining = Math.max(0, Math.floor(days));
  while (remaining > 0) {
    result.setUTCDate(result.getUTCDate() + 1);
    const weekday = result.getUTCDay();
    if (weekday !== 0 && weekday !== 6) remaining -= 1;
  }
  return result;
}

export function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function resolveProductionDays(params: {
  slas: DeliverySla[];
  tableCodeOptions: string[];
  warehouse: "PT" | "CZ";
  quantity: number;
}): number | null {
  const codes = new Set(params.tableCodeOptions.filter(Boolean));
  const matching = params.slas.filter((sla) =>
    codes.has(sla.table_code_option) &&
    sla.warehouse_code === params.warehouse &&
    sla.quantity_min <= params.quantity &&
    (sla.quantity_max === null || sla.quantity_max >= params.quantity) &&
    sla.is_available,
  );
  if (matching.length === 0) return null;
  return Math.min(...matching.map((sla) => sla.production_days));
}

export function calculateEstimatedDelivery(params: {
  start: Date;
  productionDays: number;
  setting: FulfillmentSetting;
}): string {
  return formatIsoDate(addBusinessDays(
    params.start,
    params.productionDays + params.setting.preparation_business_days + params.setting.transport_business_days,
  ));
}
