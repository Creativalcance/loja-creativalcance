import { z } from "zod";
import type { SmartQuery } from "@/lib/smart-merch/types";

const nullablePositiveInteger = z.number().int().positive().max(1_000_000).nullable();
const nullableMoney = z.number().nonnegative().max(100_000_000).nullable();
const shortList = z.array(z.string().trim().min(1).max(80)).max(12);

export const smartQuerySchema = z.object({
  originalText: z.string().trim().min(2).max(500),
  quantity: nullablePositiveInteger,
  totalBudget: nullableMoney,
  maximumUnitBudget: nullableMoney,
  productTypes: shortList,
  categories: shortList,
  uses: shortList,
  occasions: shortList,
  colors: shortList,
  materials: shortList,
  sustainable: z.boolean().nullable(),
  features: shortList,
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  keywords: shortList,
  sort: z.enum([
    "recommended",
    "lowest_price",
    "best_value",
    "highest_impact",
    "fastest_delivery",
    "sustainable",
  ]),
});

export const smartMerchRequestSchema = z.object({
  request: z.string().trim().min(2).max(500),
  quantity: z.number().int().positive().max(1_000_000).nullable().optional(),
  budget: z.number().positive().max(100_000_000).nullable().optional(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  sort: smartQuerySchema.shape.sort.optional(),
});

export function normaliseSmartQuery(query: SmartQuery): SmartQuery {
  const quantity = query.quantity;
  const totalBudget = query.totalBudget;
  const calculatedUnitBudget =
    quantity && totalBudget !== null ? totalBudget / quantity : null;

  return {
    ...query,
    maximumUnitBudget: query.maximumUnitBudget ?? calculatedUnitBudget,
  };
}
