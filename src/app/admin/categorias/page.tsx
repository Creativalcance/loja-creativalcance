import Link from "next/link";
import { ArrowLeft, FolderPlus } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createManualCategoryAction } from "./actions";

export const dynamic = "force-dynamic";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  catalog_source: string;
  is_active: boolean;
};

const input = "mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3";
const label = "text-sm font-semibold text-neutral-700";

export default async function AdminCategoriesPage() {
  const supabase = await createSupabaseServerClient();
  const result = await supabase
    .from("categories")
    .select("id,name,slug,description,catalog_source,is_active")
    .order("name");

  if (result.error) throw new Error(result.error.message);
  const categories = (result.data ?? []) as Category[];

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-8 sm:px-6">
      <section className="mx-auto max-w-5xl">
        <Link href="/admin" className="inline-flex items-center text-sm font-medium text-neutral-600">
          <ArrowLeft className="mr-2 h-4 w-4" />Voltar ao admin
        </Link>

        <div className="mt-8">
          <p className="text-sm font-medium uppercase tracking-[.2em] text-neutral-500">Administração</p>
          <h1 className="mt-3 text-3xl font-semibold">Categorias</h1>
          <p className="mt-3 text-neutral-600">Cria e consulta as categorias do catálogo independentemente dos produtos.</p>
        </div>

        <form action={createManualCategoryAction} className="mt-8 grid gap-5 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm md:grid-cols-2">
          <div className="md:col-span-2 flex items-center gap-3">
            <FolderPlus className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Nova categoria 360</h2>
          </div>
          <label className={label}>Nome<input className={input} name="categoryName" required /></label>
          <label className={label}>URL amigável<input className={input} name="categorySlug" placeholder="Gerada automaticamente" /></label>
          <label className={`${label} md:col-span-2`}>Descrição<textarea className={input} name="categoryDescription" rows={3} /></label>
          <div className="md:col-span-2 flex justify-end"><button className="rounded-2xl bg-neutral-950 px-6 py-3 font-semibold text-white">Criar categoria</button></div>
        </form>

        <section className="mt-8 overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-200 p-5"><h2 className="text-xl font-semibold">Categorias existentes</h2></div>
          <div className="divide-y divide-neutral-100">
            {categories.map((category) => (
              <article key={category.id} className="flex flex-wrap items-start justify-between gap-3 p-5">
                <div><strong>{category.name}</strong><p className="mt-1 text-sm text-neutral-500">/{category.slug}{category.description ? ` · ${category.description}` : ""}</p></div>
                <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">{category.catalog_source === "manual" ? "360" : "Sincronizada"}</span>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
