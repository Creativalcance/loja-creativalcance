import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Calendar,
  FileText,
  Mail,
  Package,
  Phone,
  User,
} from "lucide-react";
import QuoteStatusForm from "@/components/quote/QuoteStatusForm";
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
  logo_file_url: string | null;
  products: {
    slug: string;
    name: string;
  } | null;
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
  updated_at: string;
  quote_request_items: QuoteRequestItem[] | null;
};

type AdminQuoteRequestDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatDateTime(value: string): string {
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

export default async function AdminQuoteRequestDetailPage({
  params,
}: AdminQuoteRequestDetailPageProps) {
  const { id } = await params;

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

  if (!profile || !["admin", "super_admin", "sales"].includes(profile.role)) {
    redirect("/");
  }

  const { data } = await supabase
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
        updated_at,
        quote_request_items (
          id,
          product_sku,
          product_name,
          quantity,
          personalization_required,
          personalization_notes,
          logo_file_url,
          products (
            slug,
            name
          )
        )
      `,
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) {
    notFound();
  }

  const quoteRequest = data as unknown as QuoteRequest;
  const items = quoteRequest.quote_request_items ?? [];

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-10">
      <section className="mx-auto max-w-7xl">
        <Link
          href="/admin/pedidos-de-orcamento"
          className="inline-flex items-center text-sm font-medium text-neutral-600 transition hover:text-neutral-950"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar aos pedidos
        </Link>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-8">
            <section className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
              <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
                <div>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getStatusClassName(
                      quoteRequest.status,
                    )}`}
                  >
                    {getStatusLabel(quoteRequest.status)}
                  </span>

                  <p className="mt-5 text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
                    Pedido de orçamento
                  </p>

                  <h1 className="mt-3 text-4xl font-semibold tracking-tight text-neutral-950">
                    {quoteRequest.subject ?? "Pedido de orçamento"}
                  </h1>
                </div>

                <div className="rounded-2xl bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
                  <p>
                    Criado em{" "}
                    <span className="font-semibold text-neutral-950">
                      {formatDateTime(quoteRequest.created_at)}
                    </span>
                  </p>
                  <p className="mt-1">
                    Actualizado em{" "}
                    <span className="font-semibold text-neutral-950">
                      {formatDateTime(quoteRequest.updated_at)}
                    </span>
                  </p>
                </div>
              </div>

              {quoteRequest.message ? (
                <div className="mt-8 rounded-2xl bg-neutral-50 p-5">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-500">
                    Mensagem
                  </h2>

                  <p className="mt-3 whitespace-pre-line leading-8 text-neutral-700">
                    {quoteRequest.message}
                  </p>
                </div>
              ) : null}
            </section>

            <section className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-semibold tracking-tight text-neutral-950">
                Produtos solicitados
              </h2>

              {items.length > 0 ? (
                <div className="mt-6 space-y-4">
                  {items.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5"
                    >
                      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
                        <div>
                          <p className="inline-flex items-center text-sm font-medium text-neutral-500">
                            <Package className="mr-2 h-4 w-4" />
                            {item.product_sku ?? "Sem SKU"}
                          </p>

                          <h3 className="mt-2 text-xl font-semibold text-neutral-950">
                            {item.product_name}
                          </h3>

                          <p className="mt-2 text-sm text-neutral-600">
                            Quantidade:{" "}
                            <span className="font-semibold text-neutral-950">
                              {item.quantity.toLocaleString("pt-PT")}
                            </span>
                          </p>
                        </div>

                        {item.products?.slug ? (
                          <Link
                            href={`/produto/${item.products.slug}`}
                            className="inline-flex rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:border-neutral-950"
                          >
                            Ver produto público
                          </Link>
                        ) : null}
                      </div>

                      {item.personalization_notes ? (
                        <div className="mt-5 rounded-2xl bg-white p-4">
                          <p className="text-sm font-semibold text-neutral-950">
                            Notas de personalização
                          </p>

                          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-neutral-600">
                            {item.personalization_notes}
                          </p>
                        </div>
                      ) : null}

                      {item.logo_file_url ? (
                        <Link
                          href={item.logo_file_url}
                          target="_blank"
                          className="mt-4 inline-flex text-sm font-semibold text-neutral-950 underline-offset-4 hover:underline"
                        >
                          Ver ficheiro de logótipo
                        </Link>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-neutral-600">
                  Este pedido ainda não tem produtos associados.
                </p>
              )}
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-neutral-950">
                Gestão do pedido
              </h2>

              <div className="mt-6">
                <QuoteStatusForm
                  quoteRequestId={quoteRequest.id}
                  currentStatus={quoteRequest.status}
                />
              </div>
            </section>

            <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-neutral-950">
                Contacto
              </h2>

              <dl className="mt-5 space-y-4 text-sm">
                <div>
                  <dt className="inline-flex items-center text-neutral-500">
                    <User className="mr-2 h-4 w-4" />
                    Nome
                  </dt>
                  <dd className="mt-1 font-semibold text-neutral-950">
                    {quoteRequest.contact_name}
                  </dd>
                </div>

                <div>
                  <dt className="inline-flex items-center text-neutral-500">
                    <Mail className="mr-2 h-4 w-4" />
                    E-mail
                  </dt>
                  <dd className="mt-1 font-semibold text-neutral-950">
                    <a
                      href={`mailto:${quoteRequest.contact_email}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {quoteRequest.contact_email}
                    </a>
                  </dd>
                </div>

                {quoteRequest.contact_phone ? (
                  <div>
                    <dt className="inline-flex items-center text-neutral-500">
                      <Phone className="mr-2 h-4 w-4" />
                      Telefone
                    </dt>
                    <dd className="mt-1 font-semibold text-neutral-950">
                      <a
                        href={`tel:${quoteRequest.contact_phone}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {quoteRequest.contact_phone}
                      </a>
                    </dd>
                  </div>
                ) : null}

                {quoteRequest.company_name ? (
                  <div>
                    <dt className="inline-flex items-center text-neutral-500">
                      <Building2 className="mr-2 h-4 w-4" />
                      Empresa
                    </dt>
                    <dd className="mt-1 font-semibold text-neutral-950">
                      {quoteRequest.company_name}
                    </dd>
                  </div>
                ) : null}

                {quoteRequest.company_tax_id ? (
                  <div>
                    <dt className="text-neutral-500">NIF</dt>
                    <dd className="mt-1 font-semibold text-neutral-950">
                      {quoteRequest.company_tax_id}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </section>

            <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-neutral-950">
                Dados comerciais
              </h2>

              <dl className="mt-5 space-y-4 text-sm">
                <div>
                  <dt className="inline-flex items-center text-neutral-500">
                    <Calendar className="mr-2 h-4 w-4" />
                    Entrega pretendida
                  </dt>
                  <dd className="mt-1 font-semibold text-neutral-950">
                    {formatSimpleDate(quoteRequest.desired_delivery_date)}
                  </dd>
                </div>

                <div>
                  <dt className="text-neutral-500">Orçamento</dt>
                  <dd className="mt-1 font-semibold text-neutral-950">
                    {formatCurrency(quoteRequest.budget_min)} —{" "}
                    {formatCurrency(quoteRequest.budget_max)}
                  </dd>
                </div>

                <div>
                  <dt className="text-neutral-500">Contacto preferido</dt>
                  <dd className="mt-1 font-semibold text-neutral-950">
                    {quoteRequest.preferred_contact_method ?? "email"}
                  </dd>
                </div>

                <div>
                  <dt className="inline-flex items-center text-neutral-500">
                    <FileText className="mr-2 h-4 w-4" />
                    Origem
                  </dt>
                  <dd className="mt-1 font-semibold text-neutral-950">
                    {quoteRequest.source}
                  </dd>
                </div>
              </dl>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}