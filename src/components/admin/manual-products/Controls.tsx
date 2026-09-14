import Link from "next/link";
import ProductActionForm from "./ActionForm";
import { productStatuses } from "@/lib/manual-products/validation";
export type ManualProductControlData = {
  id: string;
  name: string;
  status: string;
  updated_at: string;
  deleted_at: string | null;
};
export function ProductCommandFields({
  product,
  operation,
}: {
  product: ManualProductControlData;
  operation: string;
}) {
  return (
    <>
      <input type="hidden" name="productId" value={product.id} />
      <input type="hidden" name="expectedVersion" value={product.updated_at} />
      <input type="hidden" name="operation" value={operation} />
    </>
  );
}
export default function ManualProductControls({
  product,
}: {
  product: ManualProductControlData;
}) {
  if (product.deleted_at)
    return (
      <ProductActionForm submit="Restaurar como rascunho">
        <ProductCommandFields product={product} operation="restore" />
        <p className="text-xs text-neutral-500">
          O produto volta à gestão, sem ser publicado.
        </p>
      </ProductActionForm>
    );
  return (
    <div className="min-w-52 space-y-3">
      <Link
        href={`/admin/produtos/${product.id}`}
        className="inline-flex rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold"
      >
        Editar produto
      </Link>
      <details className="rounded-xl border border-neutral-200 p-3">
        <summary className="cursor-pointer text-sm font-medium">
          Alterar estado
        </summary>
        <ProductActionForm submit="Guardar estado" className="mt-3">
          <ProductCommandFields product={product} operation="status" />
          <label className="block text-xs">
            Estado de {product.name}
            <select
              className="mt-2 w-full rounded-lg border border-neutral-300 p-2 text-sm"
              name="status"
              defaultValue={product.status}
            >
              {Object.entries(productStatuses).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </ProductActionForm>
      </details>
      <details className="rounded-xl border border-red-200 p-3">
        <summary className="cursor-pointer text-sm font-medium text-red-700">
          Eliminar produto
        </summary>
        <ProductActionForm
          submit="Eliminar produto"
          destructive
          className="mt-3"
        >
          <ProductCommandFields product={product} operation="delete" />
          <p className="text-xs leading-5 text-neutral-600">
            O produto sai da loja. As encomendas anteriores ficam preservadas.
            Podes restaurá-lo no filtro Eliminados.
          </p>
          <label className="flex items-start gap-2 text-xs">
            <input
              type="checkbox"
              name="confirmDelete"
              required
              className="mt-1"
            />
            <span>
              Confirmo eliminar <strong>{product.name}</strong>.
            </span>
          </label>
        </ProductActionForm>
      </details>
    </div>
  );
}
