import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BarChart3,
  Boxes,
  Building2,
  FileText,
  LogOut,
  PackageSearch,
  ServerCog,
  Settings,
  ShoppingBag,
  Users,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Profile = {
  full_name: string | null;
  email: string;
  role: string;
};

const adminModules = [
  {
    title: "Sincronização",
    description:
      "Acompanhar integrações com fornecedores, batches, logs e estado da Stricker.",
    href: "/admin/sincronizacao",
    icon: ServerCog,
  },
  {
    title: "Produtos",
    description:
      "Gerir catálogo, produtos, variantes, imagens, preços, stocks e destaques.",
    href: "/admin/produtos",
    icon: PackageSearch,
  },
  {
    title: "Fornecedores",
    description:
      "Gerir fornecedores, prioridades, integrações e configurações futuras.",
    href: "/admin/fornecedores",
    icon: Boxes,
  },
  {
    title: "Clientes",
    description:
      "Consultar empresas, contactos, condições comerciais e histórico.",
    href: "/admin/clientes",
    icon: Building2,
  },
  {
    title: "Encomendas",
    description:
      "Acompanhar encomendas, produção, pagamento, estados e referências externas.",
    href: "/admin/encomendas",
    icon: ShoppingBag,
  },
  {
    title: "Pedidos de orçamento",
    description:
      "Gerir pedidos submetidos, propostas, negociação e conversão em encomenda.",
    href: "/admin/pedidos-de-orcamento",
    icon: FileText,
  },
  {
    title: "Comerciais",
    description:
      "Gerir equipa comercial, leads, pipeline, objectivos e desempenho.",
    href: "/admin/comerciais",
    icon: Users,
  },
  {
    title: "Relatórios",
    description:
      "Analisar catálogo, vendas, conversão, campanhas e performance comercial.",
    href: "/admin/relatorios",
    icon: BarChart3,
  },
  {
    title: "Configurações",
    description:
      "Configurar margens, SEO, integrações, permissões e parâmetros globais.",
    href: "/admin/configuracoes",
    icon: Settings,
  },
  {
  label: "Gestão de preços",
  href: "/admin/precos",
  icon: "prices",
}
];

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-12 text-white">
      <section className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/50">
              Administração
            </p>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">
              Backoffice da Loja Creativ
            </h1>

            <p className="mt-4 max-w-2xl text-white/60">
              Gestão de produtos, fornecedores, sincronização Stricker,
              clientes, encomendas, campanhas, SEO e logs operacionais.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/70">
            <p className="font-semibold text-white">
              {profile.full_name || "Administrador"}
            </p>
            <p className="mt-1">{profile.email}</p>
            <p className="mt-2 inline-flex rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/60">
              {profile.role}
            </p>

            <Link
              href="/logout"
              className="mt-4 inline-flex items-center rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Link>
          </div>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {adminModules.map((module) => {
            const Icon = module.icon;

            return (
              <Link
                key={module.href}
                href={module.href}
                className="group rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-white/30 hover:bg-white/[0.06]"
              >
                <Icon className="h-7 w-7 text-white" />

                <h2 className="mt-8 text-xl font-semibold text-white">
                  {module.title}
                </h2>

                <p className="mt-3 text-sm leading-6 text-white/60">
                  {module.description}
                </p>

                <span className="mt-6 inline-flex text-sm font-medium text-white/80 transition group-hover:text-white">
                  Abrir módulo
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}