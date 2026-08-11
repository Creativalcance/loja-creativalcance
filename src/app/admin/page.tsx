import Link from "next/link";
import {
  BadgeEuro,
  Building2,
  FileText,
  LogOut,
  PackageSearch,
  ServerCog,
  ShoppingBag,
  Store,
  type LucideIcon,
} from "lucide-react";
import { assertAdminAccess } from "@/lib/auth/assert-admin";

type AdminModule = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

const adminModules: AdminModule[] = [
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
    title: "Gestão de preços",
    description:
      "Consultar custos dos fornecedores, margens, regras comerciais e preços finais da loja.",
    href: "/admin/precos",
    icon: BadgeEuro,
  },
  {
    title: "Utilizadores",
    description:
      "Consultar Clientes e criar, promover, bloquear ou reativar contas de Administração.",
    href: "/admin/utilizadores",
    icon: Building2,
  },
  {
    title: "Encomendas",
    description:
      "Acompanhar pagamentos, maquetes, produção, submissão à Stricker, expedição e faturação.",
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
];

export default async function AdminPage() {
  const { profile } = await assertAdminAccess("/admin");

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
              clientes, encomendas, pagamentos, preços e operação comercial.
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

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/"
                className="flex items-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-white/90"
              >
                <Store className="mr-2 h-4 w-4" />
                Ver loja
              </Link>

              <Link
                href="/logout"
                className="flex items-center rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Link>
            </div>
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
