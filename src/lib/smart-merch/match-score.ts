import type { SmartMerchReason } from "@/lib/smart-merch/types";

type Criterion = {
  weight: number;
  value: number | null;
};

export function calculateMatchScore(criteria: Criterion[]): number {
  const available = criteria.filter(
    (criterion): criterion is { weight: number; value: number } =>
      criterion.value !== null,
  );
  const totalWeight = available.reduce((sum, criterion) => sum + criterion.weight, 0);

  if (totalWeight === 0) {
    return 0;
  }

  const weightedScore = available.reduce(
    (sum, criterion) => sum + criterion.weight * Math.max(0, Math.min(1, criterion.value)),
    0,
  );

  return Math.round((weightedScore / totalWeight) * 100);
}

export function buildRecommendationReasons(input: {
  withinBudget: boolean | null;
  hasStock: boolean;
  intentScore: number;
  useScore: number | null;
  sustainableMatch: boolean | null;
  deadlineMatch: boolean | null;
}): SmartMerchReason[] {
  const reasons: SmartMerchReason[] = [];

  if (input.withinBudget) reasons.push({ code: "budget", label: "Dentro do orçamento do produto" });
  if (input.hasStock) reasons.push({ code: "stock", label: "Stock suficiente para a quantidade" });
  if (input.intentScore >= 0.5) reasons.push({ code: "intent", label: "Corresponde ao produto procurado" });
  if (input.useScore !== null && input.useScore >= 0.5) reasons.push({ code: "use", label: "Adequado à utilização indicada" });
  if (input.sustainableMatch) reasons.push({ code: "sustainable", label: "Sustentabilidade confirmada nos dados do produto" });
  if (input.deadlineMatch) reasons.push({ code: "deadline", label: "Compatível com a data pretendida" });

  return reasons.slice(0, 5);
}
