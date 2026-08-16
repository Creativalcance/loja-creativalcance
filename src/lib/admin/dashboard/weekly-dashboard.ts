import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const LISBON_TIME_ZONE = "Europe/Lisbon";
const DAY_MS = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 1000;

export type WeeklyMarketingMetricsRecord = {
  week_start: string;
  sessions: number | null;
  users: number | null;
  new_users: number | null;
  add_to_cart_sessions: number | null;
  begin_checkout_sessions: number | null;
  purchase_sessions: number | null;
  organic_sessions: number | null;
  seo_clicks: number | null;
  seo_impressions: number | null;
  google_ads_spend: number | null;
  google_ads_clicks: number | null;
  google_ads_impressions: number | null;
  google_ads_revenue: number | null;
  meta_ads_spend: number | null;
  meta_ads_clicks: number | null;
  meta_ads_impressions: number | null;
  meta_ads_revenue: number | null;
  paid_new_customers: number | null;
  email_revenue: number | null;
  notes: string | null;
  updated_at: string | null;
};

type PaidOrderRecord = {
  id: string;
  user_id: string | null;
  customer_email: string;
  grand_total: number | string | null;
  personalization_total: number | string | null;
  supplier_cost_total: number | string | null;
  paid_at: string;
  order_items?: Array<{ quantity: number | string | null }> | null;
};

type OrderCohortRecord = {
  id: string;
  status: string;
  payment_status: string;
  created_at: string;
};

type CartRecord = {
  id: string;
  status: string;
  grand_total: number | string | null;
  created_at: string;
  updated_at: string;
};

type CheckoutSessionRecord = {
  id: string;
  status: string;
  created_at: string;
};

type QuoteRequestRecord = {
  id: string;
  status: string;
  budget_min: number | string | null;
  budget_max: number | string | null;
  created_at: string;
  updated_at: string;
};

export type WeekRange = {
  weekStart: string;
  startIso: string;
  endIso: string;
  label: string;
  shortLabel: string;
};

export type WeeklyBusinessMetrics = {
  revenue: number;
  orders: number;
  aov: number | null;
  newCustomers: number;
  returningCustomers: number;
  returningCustomerRate: number | null;
  newCustomerRevenue: number;
  returningCustomerRevenue: number;
  newCustomerRevenueShare: number | null;
  unitsPerOrder: number | null;
  personalizationRevenue: number;
  personalizationRevenueShare: number | null;
  grossProfitKnownCost: number | null;
  grossMarginKnownCost: number | null;
  supplierCostCoverage: number | null;
  checkoutCompletionRate: number | null;
  internalCartAbandonmentRate: number | null;
  b2bLeads: number;
  b2bWon: number;
  b2bWinRate: number | null;
  b2bPipeline: number;
  cancelledOrders: number;
  cancellationRate: number | null;
};

export type WeeklyAcquisitionMetrics = {
  sessions: number | null;
  users: number | null;
  newUsers: number | null;
  conversionRate: number | null;
  organicTraffic: number | null;
  organicTrafficShare: number | null;
  seoClicks: number | null;
  seoImpressions: number | null;
  seoCtr: number | null;
  adSpend: number | null;
  paidRevenue: number | null;
  cac: number | null;
  roas: number | null;
  mer: number | null;
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  addToCartRate: number | null;
  checkoutRate: number | null;
  cartAbandonmentRate: number | null;
  emailRevenue: number | null;
  emailRevenueShare: number | null;
};

export type WeeklyDashboardSnapshot = {
  range: WeekRange;
  business: WeeklyBusinessMetrics;
  acquisition: WeeklyAcquisitionMetrics;
  external: WeeklyMarketingMetricsRecord | null;
};

export type WeeklyDashboardData = {
  current: WeeklyDashboardSnapshot;
  previous: WeeklyDashboardSnapshot;
  trend: WeeklyDashboardSnapshot[];
  externalMetricsReady: boolean;
  externalMetricsError: string | null;
};

function numberValue(value: number | string | null | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function safeDivide(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return null;
  }

  return numerator / denominator;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function formatDateOnly(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function getDatePartsInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(
    Number(lookup.year),
    Number(lookup.month) - 1,
    Number(lookup.day),
    Number(lookup.hour),
    Number(lookup.minute),
    Number(lookup.second),
  );

  return asUtc - date.getTime();
}

function zonedMidnightToUtc(dateOnly: string, timeZone = LISBON_TIME_ZONE): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOnly);

  if (!match) {
    throw new Error(`Data semanal inválida: ${dateOnly}`);
  }

  const targetUtc = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 0, 0, 0);
  let instant = new Date(targetUtc);

  for (let iteration = 0; iteration < 3; iteration += 1) {
    const offset = getTimeZoneOffsetMs(instant, timeZone);
    instant = new Date(targetUtc - offset);
  }

  return instant;
}

export function addDaysToDateOnly(dateOnly: string, days: number): string {
  const [year, month, day] = dateOnly.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0));

  return formatDateOnly(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function getCurrentLisbonWeekStart(): string {
  const nowParts = getDatePartsInTimeZone(new Date(), LISBON_TIME_ZONE);
  const noonUtc = new Date(Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day, 12, 0, 0));
  const weekday = noonUtc.getUTCDay();
  const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
  const monday = new Date(noonUtc.getTime() - daysFromMonday * DAY_MS);

  return formatDateOnly(monday.getUTCFullYear(), monday.getUTCMonth() + 1, monday.getUTCDate());
}

export function normalizeWeekStart(value: string | null | undefined): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return getCurrentLisbonWeekStart();
  }

  const [year, month, day] = value.split("-").map(Number);
  const candidate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() + 1 !== month ||
    candidate.getUTCDate() !== day
  ) {
    return getCurrentLisbonWeekStart();
  }

  const weekday = candidate.getUTCDay();
  const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
  const monday = new Date(candidate.getTime() - daysFromMonday * DAY_MS);

  return formatDateOnly(monday.getUTCFullYear(), monday.getUTCMonth() + 1, monday.getUTCDate());
}

export function buildWeekRange(weekStart: string): WeekRange {
  const normalized = normalizeWeekStart(weekStart);
  const endDateOnly = addDaysToDateOnly(normalized, 7);
  const endInclusiveDateOnly = addDaysToDateOnly(normalized, 6);
  const startUtc = zonedMidnightToUtc(normalized);
  const endUtc = zonedMidnightToUtc(endDateOnly);

  const labelFormatter = new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: LISBON_TIME_ZONE,
  });

  const shortFormatter = new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    timeZone: LISBON_TIME_ZONE,
  });

  const endInclusiveUtc = zonedMidnightToUtc(endInclusiveDateOnly);

  return {
    weekStart: normalized,
    startIso: startUtc.toISOString(),
    endIso: endUtc.toISOString(),
    label: `${labelFormatter.format(startUtc)} — ${labelFormatter.format(endInclusiveUtc)}`,
    shortLabel: `${shortFormatter.format(startUtc)} — ${shortFormatter.format(endInclusiveUtc)}`,
  };
}

function customerKey(order: Pick<PaidOrderRecord, "user_id" | "customer_email">): string {
  if (order.user_id) {
    return `user:${order.user_id}`;
  }

  return `email:${order.customer_email.trim().toLowerCase()}`;
}

async function fetchAllPaidOrders(untilIso: string): Promise<PaidOrderRecord[]> {
  const supabase = createSupabaseAdminClient();
  const records: PaidOrderRecord[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("orders")
      .select("id,user_id,customer_email,grand_total,personalization_total,supplier_cost_total,paid_at,order_items(quantity)")
      .eq("payment_status", "paid")
      .is("deleted_at", null)
      .not("paid_at", "is", null)
      .lt("paid_at", untilIso)
      .order("paid_at", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Não foi possível carregar as encomendas pagas do dashboard: ${error.message}`);
    }

    const page = (data ?? []) as PaidOrderRecord[];
    records.push(...page);

    if (page.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return records;
}

async function fetchRangeData(trendStartIso: string, endIso: string) {
  const supabase = createSupabaseAdminClient();

  const [ordersResult, cartsResult, checkoutResult, leadsResult] = await Promise.all([
    supabase
      .from("orders")
      .select("id,status,payment_status,created_at")
      .is("deleted_at", null)
      .gte("created_at", trendStartIso)
      .lt("created_at", endIso),
    supabase
      .from("carts")
      .select("id,status,grand_total,created_at,updated_at")
      .gte("created_at", trendStartIso)
      .lt("created_at", endIso),
    supabase
      .from("checkout_sessions")
      .select("id,status,created_at")
      .gte("created_at", trendStartIso)
      .lt("created_at", endIso),
    supabase
      .from("quote_requests")
      .select("id,status,budget_min,budget_max,created_at,updated_at")
      .gte("created_at", trendStartIso)
      .lt("created_at", endIso),
  ]);

  if (ordersResult.error) {
    throw new Error(`Não foi possível carregar o histórico de encomendas: ${ordersResult.error.message}`);
  }
  if (cartsResult.error) {
    throw new Error(`Não foi possível carregar os carrinhos: ${cartsResult.error.message}`);
  }
  if (checkoutResult.error) {
    throw new Error(`Não foi possível carregar as sessões de checkout: ${checkoutResult.error.message}`);
  }
  if (leadsResult.error) {
    throw new Error(`Não foi possível carregar os pedidos de orçamento: ${leadsResult.error.message}`);
  }

  return {
    orders: (ordersResult.data ?? []) as OrderCohortRecord[],
    carts: (cartsResult.data ?? []) as CartRecord[],
    checkoutSessions: (checkoutResult.data ?? []) as CheckoutSessionRecord[],
    leads: (leadsResult.data ?? []) as QuoteRequestRecord[],
  };
}

async function fetchExternalMetrics(trendStartDate: string, endDate: string): Promise<{
  records: WeeklyMarketingMetricsRecord[];
  ready: boolean;
  error: string | null;
}> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("marketing_weekly_metrics")
    .select(
      "week_start,sessions,users,new_users,add_to_cart_sessions,begin_checkout_sessions,purchase_sessions,organic_sessions,seo_clicks,seo_impressions,google_ads_spend,google_ads_clicks,google_ads_impressions,google_ads_revenue,meta_ads_spend,meta_ads_clicks,meta_ads_impressions,meta_ads_revenue,paid_new_customers,email_revenue,notes,updated_at",
    )
    .gte("week_start", trendStartDate)
    .lt("week_start", endDate)
    .order("week_start", { ascending: true });

  if (error) {
    if (error.code === "42P01") {
      return {
        records: [],
        ready: false,
        error: null,
      };
    }

    return {
      records: [],
      ready: false,
      error: error.message,
    };
  }

  return {
    records: (data ?? []) as WeeklyMarketingMetricsRecord[],
    ready: true,
    error: null,
  };
}

function isInside(iso: string, range: WeekRange): boolean {
  const value = new Date(iso).getTime();
  return value >= new Date(range.startIso).getTime() && value < new Date(range.endIso).getTime();
}

function buildBusinessMetrics(
  range: WeekRange,
  allPaidOrders: PaidOrderRecord[],
  cohortOrders: OrderCohortRecord[],
  carts: CartRecord[],
  checkoutSessions: CheckoutSessionRecord[],
  leads: QuoteRequestRecord[],
): WeeklyBusinessMetrics {
  const paidOrders = allPaidOrders.filter((order) => isInside(order.paid_at, range));
  const revenue = paidOrders.reduce((total, order) => total + numberValue(order.grand_total), 0);
  const orders = paidOrders.length;
  const personalizationRevenue = paidOrders.reduce(
    (total, order) => total + numberValue(order.personalization_total),
    0,
  );
  const totalUnits = paidOrders.reduce((total, order) => {
    const items = Array.isArray(order.order_items) ? order.order_items : [];
    return total + items.reduce((subtotal, item) => subtotal + numberValue(item.quantity), 0);
  }, 0);

  const firstPaidAtByCustomer = new Map<string, number>();
  for (const order of allPaidOrders) {
    const key = customerKey(order);
    const timestamp = new Date(order.paid_at).getTime();
    const current = firstPaidAtByCustomer.get(key);
    if (current === undefined || timestamp < current) {
      firstPaidAtByCustomer.set(key, timestamp);
    }
  }

  const rangeStart = new Date(range.startIso).getTime();
  const rangeEnd = new Date(range.endIso).getTime();
  const weeklyCustomerKeys = new Set<string>();
  const newCustomerKeys = new Set<string>();
  const returningCustomerKeys = new Set<string>();
  let newCustomerRevenue = 0;
  let returningCustomerRevenue = 0;

  for (const order of paidOrders) {
    const key = customerKey(order);
    weeklyCustomerKeys.add(key);
    const firstPaidAt = firstPaidAtByCustomer.get(key) ?? Number.POSITIVE_INFINITY;
    const isNew = firstPaidAt >= rangeStart && firstPaidAt < rangeEnd;

    if (isNew) {
      newCustomerKeys.add(key);
      newCustomerRevenue += numberValue(order.grand_total);
    } else {
      returningCustomerKeys.add(key);
      returningCustomerRevenue += numberValue(order.grand_total);
    }
  }

  const knownCostOrders = paidOrders.filter((order) => numberValue(order.supplier_cost_total) > 0);
  const knownCostRevenue = knownCostOrders.reduce(
    (total, order) => total + numberValue(order.grand_total),
    0,
  );
  const knownSupplierCost = knownCostOrders.reduce(
    (total, order) => total + numberValue(order.supplier_cost_total),
    0,
  );
  const grossProfitKnownCost = knownCostRevenue > 0 ? knownCostRevenue - knownSupplierCost : null;
  const grossMarginKnownCost = grossProfitKnownCost === null
    ? null
    : safeDivide(grossProfitKnownCost, knownCostRevenue);

  const weekCheckouts = checkoutSessions.filter((session) => isInside(session.created_at, range));
  const completedCheckouts = weekCheckouts.filter((session) => session.status === "completed").length;

  const weekCarts = carts.filter(
    (cart) => isInside(cart.created_at, range) && numberValue(cart.grand_total) > 0,
  );
  const now = Date.now();
  const rangeEndTime = new Date(range.endIso).getTime();
  const isPastWeek = rangeEndTime <= now;
  const abandonmentCutoff = isPastWeek ? rangeEndTime : now - DAY_MS;
  const convertedCarts = weekCarts.filter((cart) => cart.status === "converted").length;
  const abandonedCarts = weekCarts.filter((cart) => {
    if (cart.status === "abandoned" || cart.status === "expired") {
      return true;
    }
    if (cart.status !== "active") {
      return false;
    }
    return new Date(cart.updated_at).getTime() < abandonmentCutoff;
  }).length;
  const eligibleCarts = convertedCarts + abandonedCarts;

  const weekLeads = leads.filter((lead) => isInside(lead.created_at, range));
  const b2bWon = weekLeads.filter((lead) => lead.status === "won").length;
  const openLeadStatuses = new Set(["new", "in_analysis", "proposal_sent", "negotiation"]);
  const b2bPipeline = weekLeads
    .filter((lead) => openLeadStatuses.has(lead.status))
    .reduce((total, lead) => total + numberValue(lead.budget_max || lead.budget_min), 0);

  const weekCreatedOrders = cohortOrders.filter((order) => isInside(order.created_at, range));
  const cancelledOrders = weekCreatedOrders.filter((order) => order.status === "cancelled").length;

  return {
    revenue,
    orders,
    aov: safeDivide(revenue, orders),
    newCustomers: newCustomerKeys.size,
    returningCustomers: returningCustomerKeys.size,
    returningCustomerRate: safeDivide(returningCustomerKeys.size, weeklyCustomerKeys.size),
    newCustomerRevenue,
    returningCustomerRevenue,
    newCustomerRevenueShare: safeDivide(newCustomerRevenue, revenue),
    unitsPerOrder: safeDivide(totalUnits, orders),
    personalizationRevenue,
    personalizationRevenueShare: safeDivide(personalizationRevenue, revenue),
    grossProfitKnownCost,
    grossMarginKnownCost,
    supplierCostCoverage: safeDivide(knownCostRevenue, revenue),
    checkoutCompletionRate: safeDivide(completedCheckouts, weekCheckouts.length),
    internalCartAbandonmentRate: safeDivide(abandonedCarts, eligibleCarts),
    b2bLeads: weekLeads.length,
    b2bWon,
    b2bWinRate: safeDivide(b2bWon, weekLeads.length),
    b2bPipeline,
    cancelledOrders,
    cancellationRate: safeDivide(cancelledOrders, weekCreatedOrders.length),
  };
}

function buildAcquisitionMetrics(
  business: WeeklyBusinessMetrics,
  external: WeeklyMarketingMetricsRecord | null,
): WeeklyAcquisitionMetrics {
  if (!external) {
    return {
      sessions: null,
      users: null,
      newUsers: null,
      conversionRate: null,
      organicTraffic: null,
      organicTrafficShare: null,
      seoClicks: null,
      seoImpressions: null,
      seoCtr: null,
      adSpend: null,
      paidRevenue: null,
      cac: null,
      roas: null,
      mer: null,
      ctr: null,
      cpc: null,
      cpm: null,
      addToCartRate: null,
      checkoutRate: null,
      cartAbandonmentRate: business.internalCartAbandonmentRate,
      emailRevenue: null,
      emailRevenueShare: null,
    };
  }

  const sessions = external.sessions === null ? null : numberValue(external.sessions);
  const users = external.users === null ? null : numberValue(external.users);
  const newUsers = external.new_users === null ? null : numberValue(external.new_users);
  const organicTraffic = external.organic_sessions === null ? null : numberValue(external.organic_sessions);
  const seoClicks = external.seo_clicks === null ? null : numberValue(external.seo_clicks);
  const seoImpressions = external.seo_impressions === null ? null : numberValue(external.seo_impressions);
  const addToCartSessions = external.add_to_cart_sessions === null
    ? null
    : numberValue(external.add_to_cart_sessions);
  const beginCheckoutSessions = external.begin_checkout_sessions === null
    ? null
    : numberValue(external.begin_checkout_sessions);
  const purchaseSessions = external.purchase_sessions === null
    ? null
    : numberValue(external.purchase_sessions);

  const googleSpend = external.google_ads_spend === null ? 0 : numberValue(external.google_ads_spend);
  const metaSpend = external.meta_ads_spend === null ? 0 : numberValue(external.meta_ads_spend);
  const hasSpendInput = external.google_ads_spend !== null || external.meta_ads_spend !== null;
  const adSpend = hasSpendInput ? googleSpend + metaSpend : null;

  const googleRevenue = external.google_ads_revenue === null ? 0 : numberValue(external.google_ads_revenue);
  const metaRevenue = external.meta_ads_revenue === null ? 0 : numberValue(external.meta_ads_revenue);
  const hasPaidRevenue = external.google_ads_revenue !== null || external.meta_ads_revenue !== null;
  const paidRevenue = hasPaidRevenue ? googleRevenue + metaRevenue : null;

  const googleClicks = external.google_ads_clicks === null ? 0 : numberValue(external.google_ads_clicks);
  const metaClicks = external.meta_ads_clicks === null ? 0 : numberValue(external.meta_ads_clicks);
  const hasClicks = external.google_ads_clicks !== null || external.meta_ads_clicks !== null;
  const paidClicks = hasClicks ? googleClicks + metaClicks : null;

  const googleImpressions = external.google_ads_impressions === null
    ? 0
    : numberValue(external.google_ads_impressions);
  const metaImpressions = external.meta_ads_impressions === null
    ? 0
    : numberValue(external.meta_ads_impressions);
  const hasImpressions = external.google_ads_impressions !== null || external.meta_ads_impressions !== null;
  const paidImpressions = hasImpressions ? googleImpressions + metaImpressions : null;

  const paidNewCustomers = external.paid_new_customers === null
    ? null
    : numberValue(external.paid_new_customers);
  const emailRevenue = external.email_revenue === null ? null : numberValue(external.email_revenue);

  const cartAbandonmentRate = addToCartSessions !== null && addToCartSessions > 0
    ? 1 - ((purchaseSessions ?? business.orders) / addToCartSessions)
    : business.internalCartAbandonmentRate;
  const normalizedCartAbandonmentRate = cartAbandonmentRate === null
    ? null
    : Math.max(0, Math.min(1, cartAbandonmentRate));

  return {
    sessions,
    users,
    newUsers,
    conversionRate: sessions === null ? null : safeDivide(business.orders, sessions),
    organicTraffic,
    organicTrafficShare:
      organicTraffic === null || sessions === null ? null : safeDivide(organicTraffic, sessions),
    seoClicks,
    seoImpressions,
    seoCtr: seoClicks === null || seoImpressions === null ? null : safeDivide(seoClicks, seoImpressions),
    adSpend,
    paidRevenue,
    cac:
      adSpend === null || paidNewCustomers === null
        ? null
        : safeDivide(adSpend, paidNewCustomers),
    roas:
      adSpend === null || paidRevenue === null
        ? null
        : safeDivide(paidRevenue, adSpend),
    mer: adSpend === null ? null : safeDivide(business.revenue, adSpend),
    ctr:
      paidClicks === null || paidImpressions === null
        ? null
        : safeDivide(paidClicks, paidImpressions),
    cpc: adSpend === null || paidClicks === null ? null : safeDivide(adSpend, paidClicks),
    cpm:
      adSpend === null || paidImpressions === null || paidImpressions <= 0
        ? null
        : (adSpend / paidImpressions) * 1000,
    addToCartRate:
      addToCartSessions === null || sessions === null
        ? null
        : safeDivide(addToCartSessions, sessions),
    checkoutRate:
      beginCheckoutSessions === null || addToCartSessions === null
        ? null
        : safeDivide(beginCheckoutSessions, addToCartSessions),
    cartAbandonmentRate: normalizedCartAbandonmentRate,
    emailRevenue,
    emailRevenueShare: emailRevenue === null ? null : safeDivide(emailRevenue, business.revenue),
  };
}

function externalForWeek(
  records: WeeklyMarketingMetricsRecord[],
  weekStart: string,
): WeeklyMarketingMetricsRecord | null {
  return records.find((record) => record.week_start === weekStart) ?? null;
}

export async function getWeeklyDashboardData(selectedWeekStart: string): Promise<WeeklyDashboardData> {
  const currentWeekStart = normalizeWeekStart(selectedWeekStart);
  const previousWeekStart = addDaysToDateOnly(currentWeekStart, -7);
  const trendStart = addDaysToDateOnly(currentWeekStart, -49);
  const currentRange = buildWeekRange(currentWeekStart);
  const previousRange = buildWeekRange(previousWeekStart);
  const trendStartRange = buildWeekRange(trendStart);

  const [allPaidOrders, rangeData, externalResult] = await Promise.all([
    fetchAllPaidOrders(currentRange.endIso),
    fetchRangeData(trendStartRange.startIso, currentRange.endIso),
    fetchExternalMetrics(trendStart, addDaysToDateOnly(currentWeekStart, 7)),
  ]);

  const buildSnapshot = (weekStart: string): WeeklyDashboardSnapshot => {
    const range = buildWeekRange(weekStart);
    const business = buildBusinessMetrics(
      range,
      allPaidOrders,
      rangeData.orders,
      rangeData.carts,
      rangeData.checkoutSessions,
      rangeData.leads,
    );
    const external = externalForWeek(externalResult.records, range.weekStart);

    return {
      range,
      business,
      acquisition: buildAcquisitionMetrics(business, external),
      external,
    };
  };

  const trendWeekStarts = Array.from({ length: 8 }, (_, index) =>
    addDaysToDateOnly(currentWeekStart, -(7 - index) * 7),
  );

  return {
    current: buildSnapshot(currentWeekStart),
    previous: buildSnapshot(previousWeekStart),
    trend: trendWeekStarts.map(buildSnapshot),
    externalMetricsReady: externalResult.ready,
    externalMetricsError: externalResult.error,
  };
}
