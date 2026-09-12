import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createManualProductAction } from "../actions";

export const dynamic = "force-dynamic";
type Category = { id: string; name: string; catalog_source: string };
const input = "mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3";
const label = "text-sm font-semibold text-neutral-700";

export default async function NewManualProductPage() {
  const supabase = await createSupabaseServerClient();
  const result = await supabase.from("categories")
    .select("id,name,catalog_source").eq("is_active", true).order("name");
  if (result.error) throw new Error(result.error.message);
  const categories = (result.data ?? []) as Category[];
  return <main className="min-h-screen bg-neutral-50 px-4 py-8 sm:px-6"><section className="mx-auto max-w-5xl">
    <Link href="/admin/produtos" className="inline-flex items-center text-sm font-medium text-neutral-600"><ArrowLeft className="mr-2 h-4 w-4"/>Voltar aos produtos</Link>
    <h1 className="mt-8 text-3xl font-semibold">Novo produto 360</h1>
    <p className="mt-3 text-neutral-600">Fica fora da sincronização do fornecedor e, depois do pagamento, é encaminhado para a equipa 360.</p>
    <p className="mt-3 text-sm text-neutral-500">Precisas de uma categoria nova? <Link href="/admin/categorias" className="font-semibold text-neutral-950 underline">Gerir categorias</Link></p>
    <form action={createManualProductAction} className="mt-8 grid gap-6 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm md:grid-cols-2">
      <label className={label}>Nome<input className={input} name="name" required minLength={2}/></label>
      <label className={label}>SKU 360<input className={input} name="sku" required placeholder="360-PROD-001"/></label>
      <label className={label}>URL amigável<input className={input} name="slug" placeholder="Gerada automaticamente"/></label>
      <label className={label}>Categoria<select className={input} name="categoryId" required defaultValue=""><option value="" disabled>Selecionar categoria</option>{categories.map((category)=><option key={category.id} value={category.id}>{category.name}{category.catalog_source==="manual"?" · 360":""}</option>)}</select></label>
      <label className={label}>Preço unitário sem IVA (€)<input className={input} name="price" required inputMode="decimal" placeholder="9,90"/></label>
      <label className={label}>Quantidade mínima<input className={input} name="minOrderQuantity" type="number" min={1} defaultValue={10} required/></label>
      <label className={label}>Stock disponível<input className={input} name="stock" type="number" min={1} defaultValue={100} required/></label>
      <label className={label}>Prazo estimado (dias)<input className={input} name="leadTimeDays" type="number" min={1}/></label>
      <label className={label}>Estado<select className={input} name="status" defaultValue="draft"><option value="draft">Rascunho</option><option value="active">Publicado</option></select></label>
      <label className={label + " md:col-span-2"}>URL da imagem principal<input className={input} name="imageUrl" type="url" placeholder="https://..."/></label>
      <label className={label}>Marca<input className={input} name="brand"/></label>
      <label className={label}>Material<input className={input} name="material"/></label>
      <label className={label + " md:col-span-2"}>Descrição curta<textarea className={input} name="shortDescription" rows={2}/></label>
      <label className={label + " md:col-span-2"}>Descrição completa<textarea className={input} name="description" rows={5}/></label>
      <label className={label}>Título SEO<input className={input} name="seoTitle"/></label>
      <label className={label}>Descrição SEO<textarea className={input} name="seoDescription" rows={2}/></label>
      <label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" name="featured"/>Apresentar em destaque</label>
      <div className="md:col-span-2 flex justify-end"><button className="rounded-2xl bg-orange-600 px-6 py-3 font-semibold text-white">Criar produto</button></div>
    </form>
  </section></main>;
}
