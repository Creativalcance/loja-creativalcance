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
    .min(10, "A quantidade mínima da loja é 10 unidades.")
    .max(1000000),
  stock: z
    .number()
    .int()
    .min(0, "O stock não pode ser negativo.")
    .max(100000000),
  lead_time_days: z.number().int().min(1).max(3650).nullable(),
  status: z.enum(["draft", "active", "inactive", "archived"]),
  featured: z.boolean(),
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
});
export function manualProductPrice(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,4})?$/.test(normalized))
    throw new Error("Indica um preço válido, com até quatro casas decimais.");
  return Number(normalized);
}
