import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Calendar,
  ClipboardList,
  Mail,
  Package,
  Phone,
  User,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Profile = {
  role: string;
};

type QuoteRequestItem = {
  id: string;
  product_sku: string | null;
  product_name: string;
  quantity: number;
  personalization_required: boolean;
  personalization_notes: string | null;
};

type QuoteRequest = {
  id: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  company_name: string | null;
  company_tax_id: string | null;
  subject: string | null;
  message: string | null;
  status: string;
  source: string;
  preferred_contact_method: string | null;
  budget_min: number | null;
  budget_max: number | null;
  desired_delivery_date: string | null;
  created_at: string;
  quote_request_items: QuoteRequestItem[] | null;
};

type AdminQuoteRequestsPageProps = {
  searchParams?: Promise<{
    status?: string;
    q?: string;
  }>;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatSimpleDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "short",
  }).format(new Date(value));
}

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) {
    return "—";
  }

  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    new: "Novo",
    in_analysis: "Em análise",
    proposal_sent: "Proposta enviada",
    negotiation: "Negociação",
    won: "Ganho",
    lost: "Perdido",
    cancelled: "Cancelado",
  };

  return labels[status] ?? status;
}

function getStatusClassName(status: string): string {
  if (status === "new") {
    return "bg-blue-50 text-blue-700 ring-blue-200";
  }

  if (status === "in_analysis" || status === "negotiation") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  if (status === "proposal_sent") {
    return "bg-indigo-50 text-indigo-700 ring-indigo-200";
  }

  if (status === "won") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (status === "lost" || status === "cancelled") {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  return "bg-neutral-100 text-neutral-700 ring-neutral-200";
}

export default async function AdminQuoteRequestsPage({
  searchParams,
}: AdminQuoteRequestsPageProps) {
  const resolvedSearchParams = await searchParams;
  const status = resolvedSearchParams?.status?.trim() ?? "";
  const query = resolvedSearchParams?.q?.trim() ?? "";

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile || profile.role !== "admin") {
    redirect("/");
  }

  let quoteRequestsQuery = supabase
    .from("quote_requests")
    .select(
      `
        id,
        contact_name,
        contact_email,
        contact_phone,
        company_name,
        company_tax_id,
        subject,
        message,
        status,
        source,
        preferred_contact_method,
        budget_min,
        budget_max,
        desired_delivery_date,
        created_at,
        quote_request_items (
          id,
          product_sku,
          product_name,
          quantity,
          personalization_required,
          personalization_notes
        )
      `,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (status) {
    quoteRequestsQuery = quoteRequestsQuery.eq("status", status);
  }

  if (query) {
    quoteRequestsQuery = quoteRequestsQuery.or(
      `contact_name.ilike.%${query}%,contact_email.ilike.%${query}%,company_name.ilike.%${query}%,subject.ilike.%${query}%`,
    );
  }

  const { data: quoteRequestsData, count } = await quoteRequestsQuery;

  const quoteRequests = (quoteRequestsData ?? []) as unknown as QuoteRequest[];
  const totalRequests = count ?? 0;

  const [
    { count: newCount },
    { count: inAnalysisCount },
    { count: proposalSentCount },
    { count: wonCount },
  ] = await Promise.all([
    supabase
      .from("quote_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),
    supabase
      .from("quote_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "in_analysis"),
    supabase
      .from("quote_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "proposal_sent"),
    supabase
      .from("quote_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "won"),
  ]);

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-10">
      <section className="mx-auto max-w-7xl">
        <Link
          href="/admin"
          className="inline-flex items-center text-sm font-medium text-neutral-600 transition hover:text-neutral-950"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao admin
        </Link>

        <div className="mt-8 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
              Administração
            </p>

            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-neutral-950">
              Pedidos de orçamento
            </h1>

            <p className="mt-4 max-w-3xl text-neutral-600">
              Gestão dos pedidos submetidos através do website, páginas de
              produto e contactos comerciais.
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-4">
          <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <ClipboardList className="h-6 w-6 text-neutral-500" />
            <p className="mt-5 text-sm text-neutral-500">Total listado</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-neutral-950">
              {totalRequests.toLocaleString("pt-PT")}
            </p>
          </div>

          <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <ClipboardList className="h-6 w-6 text-blue-600" />
            <p className="mt-5 text-sm text-neutral-500">Novos</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-neutral-950">
              {(newCount ?? 0).toLocaleString("pt-PT")}
            </p>
          </div>

          <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <ClipboardList className="h-6 w-6 text-amber-600" />
            <p className="mt-5 text-sm text-neutral-500">Em análise</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-neutral-950">
              {(inAnalysisCount ?? 0).toLocaleString("pt-PT")}
            </p>
          </div>

          <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <ClipboardList className="h-6 w-6 text-emerald-600" />
            <p className="mt-5 text-sm text-neutral-500">Ganhos</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-neutral-950">
              {(wonCount ?? 0).toLocaleString("pt-PT")}
            </p>
          </div>
        </div>

        <section className="mt-8 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <form
            action="/admin/pedidos-de-orcamento"
            className="grid gap-4 lg:grid-cols-[1fr_240px_auto]"
          >
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Pesquisar por nome, e-mail, empresa ou assunto"
              className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
            />

            <select
              name="status"
              defaultValue={status}
              className="rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
            >
              <option value="">Todos os estados</option>
              <option value="new">Novo</option>
              <option value="in_analysis">Em análise</option>
              <option value="proposal_sent">Proposta enviada</option>
              <option value="negotiation">Negociação</option>
              <option value="won">Ganho</option>
              <option value="lost">Perdido</option>
              <option value="cancelled">Cancelado</option>
            </select>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-2xl bg-neutral-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              Filtrar
            </button>
          </form>
        </section>

        <section className="mt-8 space-y-5">
          {quoteRequests.length > 0 ? (
            quoteRequests.map((quoteRequest) => {
              const firstItem = quoteRequest.quote_request_items?.[0] ?? null;

              return (
                <article
  key={quoteRequest.id}
  className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:border-neutral-300 hover:shadow-md"
>
                  <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getStatusClassName(
                            quoteRequest.status,
                          )}`}
                        >
                          {getStatusLabel(quoteRequest.status)}
                        </span>

                        <span className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-400">
                          {quoteRequest.source}
                        </span>
                      </div>

                      <h2 className="mt-4 text-2xl font-semibold tracking-tight text-neutral-950">
                        {quoteRequest.subject ?? "Pedido de orçamento"}
                      </h2>

                      <div className="mt-4 grid gap-3 text-sm text-neutral-600 md:grid-cols-2">
                        <p className="inline-flex items-center">
                          <User className="mr-2 h-4 w-4 text-neutral-400" />
                          {quoteRequest.contact_name}
                        </p>

                        <p className="inline-flex items-center">
                          <Mail className="mr-2 h-4 w-4 text-neutral-400" />
                          {quoteRequest.contact_email}
                        </p>

                        {quoteRequest.contact_phone ? (
                          <p className="inline-flex items-center">
                            <Phone className="mr-2 h-4 w-4 text-neutral-400" />
                            {quoteRequest.contact_phone}
                          </p>
                        ) : null}

                        {quoteRequest.company_name ? (
                          <p className="inline-flex items-center">
                            <Building2 className="mr-2 h-4 w-4 text-neutral-400" />
                            {quoteRequest.company_name}
                          </p>
                        ) : null}

                        <p className="inline-flex items-center">
                          <Calendar className="mr-2 h-4 w-4 text-neutral-400" />
                          Criado em {formatDate(quoteRequest.created_at)}
                        </p>

                        <p className="inline-flex items-center">
                          <Calendar className="mr-2 h-4 w-4 text-neutral-400" />
                          Entrega pretendida:{" "}
                          {formatSimpleDate(
                            quoteRequest.desired_delivery_date,
                          )}
                        </p>
                      </div>

                      {quoteRequest.message ? (
                        <p className="mt-5 max-w-4xl rounded-2xl bg-neutral-50 p-4 text-sm leading-6 text-neutral-600">
                          {quoteRequest.message}
                        </p>
                      ) : null}
                    </div>

                    <div className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 p-5 lg:max-w-sm">
                      <p className="text-sm font-semibold text-neutral-950">
                        Produto principal
                      </p>

                      {firstItem ? (
                        <div className="mt-4 space-y-3 text-sm text-neutral-600">
                          <p className="inline-flex items-start">
                            <Package className="mr-2 mt-0.5 h-4 w-4 text-neutral-400" />
                            <span>
                              <span className="font-semibold text-neutral-950">
                                {firstItem.product_name}
                              </span>
                              {firstItem.product_sku ? (
                                <span className="block text-neutral-500">
                                  {firstItem.product_sku}
                                </span>
                              ) : null}
                            </span>
                          </p>

                          <p>
                            Quantidade:{" "}
                            <span className="font-semibold text-neutral-950">
                              {firstItem.quantity.toLocaleString("pt-PT")}
                            </span>
                          </p>

                          {firstItem.personalization_notes ? (
                            <p className="leading-6">
                              {firstItem.personalization_notes}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-neutral-500">
                          Sem produto associado.
                        </p>
                      )}

                      <div className="mt-5 border-t border-neutral-200 pt-4 text-sm text-neutral-600">
                        <p>
                          Orçamento:{" "}
                          <span className="font-semibold text-neutral-950">
                            {formatCurrency(quoteRequest.budget_min)} —{" "}
                            {formatCurrency(quoteRequest.budget_max)}
                          </span>
                        </p>

                        <p className="mt-2">
                          Contacto preferido:{" "}
                          <span className="font-semibold text-neutral-950">
                            {quoteRequest.preferred_contact_method ?? "email"}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 border-t border-neutral-100 pt-5">
  <Link
    href={`/admin/pedidos-de-orcamento/${quoteRequest.id}`}
    className="inline-flex rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
  >
    Ver detalhe do pedido
  </Link>
</div>
                </article>
              );
            })
          ) : (
            <div className="rounded-3xl border border-neutral-200 bg-white p-12 text-center shadow-sm">
              <h2 className="text-xl font-semibold text-neutral-950">
                Ainda não existem pedidos de orçamento
              </h2>

              <p className="mt-3 text-neutral-600">
                Quando um utilizador submeter o formulário de contacto, o pedido
                irá aparecer aqui.
              </p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
