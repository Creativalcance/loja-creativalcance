import Link from "next/link";
import { Download, Mail, Users } from "lucide-react";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type Subscriber = { id: string; name: string; email: string; locale: string; status: string; source: string; consented_at: string; created_at: string };

export default async function NewsletterAdminPage() {
  await assertAdminAccess("/admin/newsletter");
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("newsletter_subscribers").select("id,name,email,locale,status,source,consented_at,created_at").order("created_at", { ascending: false }).returns<Subscriber[]>();
  if (error) throw new Error(`Não foi possível carregar a newsletter: ${error.message}`);
  const subscribers = data ?? [];
  const active = subscribers.filter((item) => item.status === "active").length;

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-12 text-white">
      <section className="mx-auto max-w-7xl">
        <Link href="/admin" className="text-sm font-semibold text-white/60 hover:text-white">← Voltar ao backoffice</Link>
        <div className="mt-7 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[.2em] text-white/50">Comunicação</p>
            <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Newsletter</h1>
            <p className="mt-3 max-w-3xl text-white/60">Lista de contactos que consentiram receber comunicações da 360 Merchandising.</p>
          </div>
          <Link href="/api/admin/newsletter/exportar" className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-neutral-950">
            <Download className="mr-2 h-4 w-4" />Exportar lista CSV
          </Link>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <article className="rounded-3xl border border-white/10 bg-white/[.03] p-5"><Users className="h-6 w-6" /><p className="mt-4 text-sm text-white/50">Subscritores ativos</p><p className="mt-1 text-3xl font-semibold">{active}</p></article>
          <article className="rounded-3xl border border-white/10 bg-white/[.03] p-5"><Mail className="h-6 w-6" /><p className="mt-4 text-sm text-white/50">Registos totais</p><p className="mt-1 text-3xl font-semibold">{subscribers.length}</p></article>
        </div>
        <div className="mt-8 overflow-x-auto rounded-3xl border border-white/10">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-white/5 text-white/60"><tr><th className="p-4">Nome</th><th className="p-4">Email</th><th className="p-4">Idioma</th><th className="p-4">Estado</th><th className="p-4">Consentimento</th><th className="p-4">Origem</th></tr></thead>
            <tbody>{subscribers.map((item) => <tr key={item.id} className="border-t border-white/10"><td className="p-4 font-semibold">{item.name}</td><td className="p-4 text-white/70">{item.email}</td><td className="p-4 uppercase">{item.locale}</td><td className="p-4"><span className={item.status === "active" ? "rounded-full bg-emerald-400/15 px-3 py-1 text-emerald-300" : "rounded-full bg-white/10 px-3 py-1 text-white/60"}>{item.status === "active" ? "Ativo" : "Cancelado"}</span></td><td className="p-4 text-white/60">{new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.consented_at))}</td><td className="p-4 text-white/60">{item.source}</td></tr>)}</tbody>
          </table>
          {subscribers.length === 0 ? <p className="border-t border-white/10 p-8 text-center text-white/50">Ainda não existem subscrições.</p> : null}
        </div>
      </section>
    </main>
  );
}
