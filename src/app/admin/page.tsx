import Link from "next/link";
import {
  BadgeEuro,
  Building2,
  FileText,
  Bell,
  LogOut,
  PackageSearch,
  ServerCog,
  ShoppingBag,
  Store,
  type LucideIcon,
} from "lucide-react";
import { markAllAdminNotificationsAsRead } from "@/lib/admin/notifications/actions";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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
      "Acompanhar integrações com fornecedores, batches, logs e estado da sincronização.",
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
    title: "Utilizadores e Contas",
    description:
      "Consultar clientes, contactos e moradas, exportar a base de dados e gerir contas de Administração.",
    href: "/admin/utilizadores",
    icon: Building2,
  },
  {
    title: "Encomendas",
    description:
      "Acompanhar pagamentos, maquetes, produção, submissão ao fornecedor, expedição e faturação.",
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
  const { profile, userId } = await assertAdminAccess("/admin");
  const supabase = createSupabaseAdminClient();
  const { data: notifications, error: notificationsError } = await supabase
    .from("admin_notifications")
    .select("id,order_id,title,message,email_status,created_at,admin_notification_reads!left(user_id)")
    .order("created_at", { ascending: false })
    .limit(8);

  if (notificationsError) {
    throw new Error(
      `Não foi possível carregar as notificações administrativas: ${notificationsError.message}`,
    );
  }

  const latestNotifications = (notifications ?? []).map((notification) => ({
    ...notification,
    read: Array.isArray(notification.admin_notification_reads)
      ? notification.admin_notification_reads.some((read) => read.user_id === userId)
      : false,
  }));
  const unreadCount = latestNotifications.filter((notification) => !notification.read).length;

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
              Gestão de produtos, fornecedores, sincronização do catálogo,
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

              <form action="/logout" method="post">
                <button
                  type="submit"
                  className="flex items-center rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </button>
              </form>
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

        <section className="mt-12 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white text-neutral-950">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
                    {unreadCount}
                  </span>
                ) : null}
              </span>
              <div>
                <h2 className="text-xl font-semibold">Notificações operacionais</h2>
                <p className="mt-1 text-sm text-white/55">
                  Submissões ao fornecedor e respetivo estado do email.
                </p>
              </div>
            </div>

            {unreadCount > 0 ? (
              <form action={markAllAdminNotificationsAsRead}>
                <button
                  type="submit"
                  className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold transition hover:bg-white/10"
                >
                  Marcar como lidas
                </button>
              </form>
            ) : null}
          </div>

          <div className="mt-6 divide-y divide-white/10">
            {latestNotifications.length > 0 ? (
              latestNotifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={notification.order_id ? `/admin/encomendas/${notification.order_id}` : "/admin/encomendas"}
                  className="flex flex-col gap-2 py-4 transition hover:bg-white/[0.03] sm:flex-row sm:items-center sm:justify-between sm:px-3"
                >
                  <div>
                    <p className={`font-medium ${notification.read ? "text-white/65" : "text-white"}`}>
                      {!notification.read ? <span className="mr-2 inline-block h-2 w-2 rounded-full bg-sky-400" /> : null}
                      {notification.title}
                    </p>
                    <p className="mt-1 text-sm text-white/50">{notification.message}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/45">
                    <span className={notification.email_status === "sent" ? "text-emerald-300" : notification.email_status === "failed" ? "text-red-300" : "text-amber-300"}>
                      {notification.email_status === "sent" ? "Email enviado" : notification.email_status === "failed" ? "Email por enviar" : "Email em processamento"}
                    </span>
                    <time dateTime={notification.created_at}>
                      {new Intl.DateTimeFormat("pt-PT", {
                        dateStyle: "short",
                        timeStyle: "short",
                        timeZone: "Europe/Lisbon",
                      }).format(new Date(notification.created_at))}
                    </time>
                  </div>
                </Link>
              ))
            ) : (
              <p className="py-8 text-sm text-white/50">Ainda não existem notificações.</p>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
