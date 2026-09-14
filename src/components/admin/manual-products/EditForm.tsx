import ProductActionForm from "./ActionForm";
import {
  ProductCommandFields,
  type ManualProductControlData,
} from "./Controls";
import { productStatuses } from "@/lib/manual-products/validation";
export type ManualProductEditData = ManualProductControlData & {
  sku: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  brand: string | null;
  material: string | null;
  min_order_quantity: number;
  lead_time_days: number | null;
  seo_title: string | null;
  seo_description: string | null;
  is_featured: boolean;
};
const input =
  "mt-2 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 font-normal";
export default function ManualProductEditForm({
  product,
  categories,
  categoryId,
  price,
  stock,
  imageUrl,
}: {
  product: ManualProductEditData;
  categories: { id: string; name: string; is_active: boolean }[];
  categoryId: string;
  price: number;
  stock: number;
  imageUrl: string;
}) {
  const field = (
    label: string,
    name: string,
    value: string | number | null,
    type = "text",
    props: Record<string, unknown> = {},
  ) => (
    <label className="block text-sm font-semibold">
      {label}
      <input
        className={input}
        name={name}
        defaultValue={value ?? ""}
        type={type}
        {...props}
      />
    </label>
  );
  return (
    <ProductActionForm
      submit="Guardar alterações"
      className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"
    >
      <ProductCommandFields product={product} operation="edit" />
      <div className="grid gap-5 md:grid-cols-2">
        {field("Nome", "name", product.name, "text", {
          required: true,
          minLength: 2,
          maxLength: 300,
        })}
        {field("SKU 360", "sku", product.sku, "text", {
          required: true,
          maxLength: 100,
        })}
        <div>
          {field("URL amigável", "slug", product.slug, "text", {
            required: true,
          })}
          <p className="mt-2 text-xs text-neutral-500">
            Alterar este campo muda o endereço público do produto.
          </p>
        </div>
        <label className="block text-sm font-semibold">
          Categoria principal
          <select
            className={input}
            name="category_id"
            required
            defaultValue={categoryId}
          >
            <option value="" disabled>
              Selecionar categoria
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id} disabled={!c.is_active}>
                {c.name}
                {!c.is_active ? " · Inativa" : ""}
              </option>
            ))}
          </select>
        </label>
        {field("Preço unitário sem IVA (€)", "price", price, "text", {
          required: true,
          inputMode: "decimal",
        })}
        {field(
          "Quantidade mínima",
          "minimum",
          product.min_order_quantity,
          "number",
          { required: true, min: 10, max: 1000000 },
        )}
        <div>
          {field("Stock disponível", "stock", stock, "number", {
            required: true,
            min: 0,
            max: 100000000,
          })}
          <p className="mt-2 text-xs text-neutral-500">
            Se ficar abaixo da quantidade mínima, o produto fica indisponível
            para compra.
          </p>
        </div>
        {field(
          "Prazo estimado (dias)",
          "lead_time_days",
          product.lead_time_days,
          "number",
          { min: 1, max: 3650 },
        )}
        <label className="block text-sm font-semibold">
          Estado
          <select name="status" defaultValue={product.status} className={input}>
            {Object.entries(productStatuses).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            name="featured"
            defaultChecked={product.is_featured}
          />
          Apresentar em destaque
        </label>
        <div className="md:col-span-2">
          {field("URL da imagem principal", "image_url", imageUrl, "url")}
          <p className="mt-2 text-xs text-neutral-500">
            Deixa vazio para retirar a imagem principal.
          </p>
        </div>
        {field("Marca", "brand", product.brand)}
        {field("Material", "material", product.material)}
        <label className="text-sm font-semibold md:col-span-2">
          Descrição curta
          <textarea
            className={input}
            name="short_description"
            rows={3}
            defaultValue={product.short_description ?? ""}
          />
        </label>
        <label className="text-sm font-semibold md:col-span-2">
          Descrição completa
          <textarea
            className={input}
            name="description"
            rows={7}
            defaultValue={product.description ?? ""}
          />
        </label>
        {field("Título SEO", "seo_title", product.seo_title)}
        {field("Descrição SEO", "seo_description", product.seo_description)}
      </div>
    </ProductActionForm>
  );
}
