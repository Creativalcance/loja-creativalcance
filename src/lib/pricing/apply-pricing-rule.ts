import type {
  PricingPriceType,
  PricingRule,
  PricingRuleContext,
} from "@/lib/pricing/types";

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isQuantityInRange(rule: PricingRule, quantity: number): boolean {
  const minQuantity = rule.min_quantity ?? null;
  const maxQuantity = rule.max_quantity ?? null;

  if (minQuantity !== null && quantity < minQuantity) {
    return false;
  }

  if (maxQuantity !== null && quantity > maxQuantity) {
    return false;
  }

  return true;
}

function isCustomerGroupMatch(
  rule: PricingRule,
  context: PricingRuleContext,
): boolean {
  const ruleGroup = normalizeText(rule.customer_group ?? "default");
  const contextGroup = normalizeText(context.customerGroup ?? "default");

  return ruleGroup === "default" || ruleGroup === contextGroup;
}

function isPriceTypeMatch(
  rule: PricingRule,
  context: PricingRuleContext,
): boolean {
  const rulePriceType: PricingPriceType = rule.price_type ?? "product";
  const contextPriceType: PricingPriceType = context.priceType ?? "product";

  return rulePriceType === contextPriceType;
}

function isRuleMatch(rule: PricingRule, context: PricingRuleContext): boolean {
  if (rule.is_active === false) {
    return false;
  }

  if (!isPriceTypeMatch(rule, context)) {
    return false;
  }

  if (!isQuantityInRange(rule, context.quantity)) {
    return false;
  }

  if (!isCustomerGroupMatch(rule, context)) {
    return false;
  }

  if (rule.scope === "global") {
    return true;
  }

  if (rule.scope === "supplier") {
    return Boolean(
      rule.supplier_id &&
        context.supplierId &&
        rule.supplier_id === context.supplierId,
    );
  }

  if (rule.scope === "category") {
    return (
      normalizeText(rule.category_name) === normalizeText(context.categoryName)
    );
  }

  if (rule.scope === "product") {
    return Boolean(
      rule.product_id &&
        context.productId &&
        rule.product_id === context.productId,
    );
  }

  if (rule.scope === "variant") {
    return Boolean(
      rule.variant_id &&
        context.variantId &&
        rule.variant_id === context.variantId,
    );
  }

  return false;
}

function getScopeSpecificity(rule: PricingRule): number {
  if (rule.scope === "variant") {
    return 50;
  }

  if (rule.scope === "product") {
    return 40;
  }

  if (rule.scope === "category") {
    return 30;
  }

  if (rule.scope === "supplier") {
    return 20;
  }

  return 10;
}

function getRuleScore(rule: PricingRule): number {
  let score = getScopeSpecificity(rule);

  if (rule.customer_group && normalizeText(rule.customer_group) !== "default") {
    score += 5;
  }

  if (rule.min_quantity !== null || rule.max_quantity !== null) {
    score += 2;
  }

  return score;
}

export function findBestPricingRule(
  rules: PricingRule[],
  context: PricingRuleContext,
): PricingRule | null {
  const matchingRules = rules.filter((rule) => isRuleMatch(rule, context));

  if (matchingRules.length === 0) {
    return null;
  }

  return (
    [...matchingRules].sort((a, b) => {
      const priorityA = a.priority ?? 1000;
      const priorityB = b.priority ?? 1000;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      return getRuleScore(b) - getRuleScore(a);
    })[0] ?? null
  );
}