import { z } from "zod";
export const productStatuses = {
  draft: "Rascunho",
  active: "Publicado",
  inactive: "Inativo",
  archived: "Arquivado",
} as const;
export const manualProductCommand = z.object({
  productId: z.string().uuid("Produto inválido."),
  expectedVersion: z
    .string()
    .datetime({ offset: true, message: "Atualiza a página antes de guardar." }),
  operation: z.enum(["edit", "status", "delete", "restore"]),
});
const optionalText = (max: number) => z.string().trim().max(max);
export const manualProductData = z.object({
  name: z.string().trim().min(2, "Indica o nome do produto.").max(300),
  sku: z
    .string()
    .trim()
    .min(1, "Indica o SKU.")
    .max(100)
    .regex(
      /^[\p{L}\p{N}._/-]+$/u,
      "O SKU só pode conter letras, números, ponto, hífen, barra e sublinhado.",
    ),
  slug: z
    .string()
    .min(1)
    .max(140)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Indica uma URL amigável válida."),
  category_id: z.string().uuid("Seleciona uma categoria."),
  price: z.number().positive("Indica um preço superior a zero.").max(1000000),
  minimum: z
    .number()
    .int()
    .min(1, "A quantidade mínima deve ser pelo menos 1 unidade.")
    .max(1000000),
  stock: z
    .number()
    .int()
    .min(0, "O stock não pode ser negativo.")
    .max(100000000),
  lead_time_days: z.number().int().min(1).max(3650).nullable(),
  status: z.enum(["draft", "active", "inactive", "archived"]),
  featured: z.boolean(),
  shipping_profile: z.enum(["standard", "christmas_hamper_2026"]).optional(),
  delivery_unit_price: z.number().positive().max(10000).nullable().optional(),
  weight: z.number().positive().max(1000000).nullable().optional(),
  dimensions: optionalText(200).optional(),
  image_url: z
    .string()
    .trim()
    .max(4000)
    .refine((v) => {
      if (!v) return true;
      try {
        const u = new URL(v);
        return (
          ["https:", "http:"].includes(u.protocol) && !u.username && !u.password
        );
      } catch {
        return false;
      }
    }, "Indica um URL HTTP ou HTTPS válido para a imagem."),
  short_description: optionalText(2000),
  description: optionalText(50000),
  brand: optionalText(200),
  material: optionalText(500),
  seo_title: optionalText(300),
  seo_description: optionalText(1000),
}).superRefine((data, ctx) => {
  if (data.shipping_profile !== "christmas_hamper_2026" && data.minimum < 10)
    ctx.addIssue({ code: "custom", path: ["minimum"], message: "A quantidade mínima dos restantes produtos é 10 unidades." });
  if (data.shipping_profile === "christmas_hamper_2026" && !data.delivery_unit_price)
    ctx.addIssue({ code: "custom", path: ["delivery_unit_price"], message: "Indica os portes por cabaz, sem IVA." });
});

export function manualProductLogistics(formData: FormData) {
  const number = (key: string) => {
    const raw = String(formData.get(key) ?? "").trim().replace(",", ".");
    if (!raw) return null;
    if (!/^\d+(?:\.\d{1,4})?$/.test(raw)) throw new Error("Indica valores válidos para o peso e os portes.");
    return Number(raw);
  };
  const weightKg = number("weight_kg");
  const profile = String(formData.get("shipping_profile") ?? "standard");
  const data = z.object({
    weight: z.number().positive().max(1000000).nullable(),
    dimensions: z.string().trim().max(200),
    shipping_profile: z.enum(["standard", "christmas_hamper_2026"]),
    delivery_unit_price: z.number().positive().max(10000).nullable(),
  }).parse({
    weight: weightKg === null ? null : Math.round(weightKg * 1000),
    dimensions: String(formData.get("dimensions") ?? ""),
    shipping_profile: profile,
    delivery_unit_price: profile === "christmas_hamper_2026" ? number("delivery_unit_price") : null,
  });
  if (data.shipping_profile === "christmas_hamper_2026" && !data.delivery_unit_price)
    throw new Error("Indica os portes por cabaz, sem IVA.");
  return data;
}
export function manualProductPrice(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,4})?$/.test(normalized))
    throw new Error("Indica um preço válido, com até quatro casas decimais.");
  return Number(normalized);
}
