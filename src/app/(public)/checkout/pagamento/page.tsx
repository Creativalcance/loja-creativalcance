import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CreditCard,
  MapPin,
  Package,
  Truck,
} from "lucide-react";
import CheckoutPaymentForm from "@/components/checkout/CheckoutPaymentForm";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type CartItem = {
  id: string;
  product_name: string;
  quantity: number;
  subtotal: number;
  personalization_total: number;
  setup_cost: number;
  extras_total: number;
  total: number;
  personalization_required: boolean;
  customization_location_name: string | null;
  customization_technique_name: string | null;
  logo_file_name: string | null;
};

type ShippingAddress = {
  id: string;
  company_name: string | null;
  contact_name: string;
  address_line_1: string;
  address_line_2: string | null;
  postal_code: string;
  city: string;
  district: string | null;
  country_code: string;
};

type Cart = {
  id: string;
  status: string;
  checkout_step: string;
  currency: string;
  subtotal: number;
  personalization_total: number;
  setup_total: number;
  shipping_total: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  customer_name: string | null;
  customer_email: string | null;
  company_name: string | null;
  company_tax_id: string | null;
  shipping_address_id: string | null;
  shipping_method: string | null;
  shipping_method_name: string | null;
  requested_delivery_date: string | null;
  tax_rate: number;
  tax_region: string | null;
  customer_addresses: ShippingAddress | null;
  cart_items: CartItem[] | null;
};

function formatPrice(value: number, currency: string): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency,
  }).format(Number(value ?? 0));
}

function normalizeText(value: string | null): string {
  return (
    value
      ?.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase() ?? ""
  );
}

function determineTaxRate(address: ShippingAddress): number {
  const searchableText = normalizeText(
    [
      address.district,
      address.city,
      address.address_line_1,
      address.address_line_2,
    ]
      .filter(Boolean)
      .join(" "),
  );

  const azoresTerms = [
    "acores",
    "ponta delgada",
    "angra do heroismo",
    "ribeira grande",
    "praia da vitoria",
    "horta",
    "sao miguel",
    "terceira",
    "faial",
    "pico",
    "flores",
    "corvo",
  ];

  if (azoresTerms.some((term) => searchableText.includes(term))) {
    return 0.16;
  }

  const madeiraTerms = [
    "madeira",
    "funchal",
    "porto santo",
    "camara de lobos",
    "machico",
    "santa cruz",
    "ribeira brava",
    "calheta",
    "santana",
  ];

  if (madeiraTerms.some((term) => searchableText.includes(term))) {
    return 0.22;
  }

  return 0.23;
}

export default async function CheckoutPaymentPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const supabaseAdmin = createSupabaseAdminClient();

  const { data: cartData, error: cartError } = await supabaseAdmin
    .from("carts")
    .select(
      `
        id,
        status,
        checkout_step,
        currency,
        subtotal,
        personalization_total,
        setup_total,
        shipping_total,
        discount_total,
        tax_total,
        grand_total,
        customer_name,
        customer_email,
        company_name,
        company_tax_id,
        shipping_address_id,
        shipping_method,
        shipping_method_name,
        requested_delivery_date,
        tax_rate,
        tax_region,
        customer_addresses!carts_shipping_address_id_fkey (
          id,
          company_name,
          contact_name,
          address_line_1,
          address_line_2,
          postal_code,
          city,
          district,
          country_code
        ),
        cart_items (
          id,
          product_name,
          quantity,
          subtotal,
          personalization_total,
          setup_cost,
          extras_total,
          total,
          personalization_required,
          customization_location_name,
          customization_technique_name,
          logo_file_name
        )
      `,
    )
    .eq("status", "active")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (cartError || !cartData) {
    redirect("/carrinho");
  }

  const cart = cartData as unknown as Cart;
  const items = cart.cart_items ?? [];
  const address = cart.customer_addresses;

  if (items.length === 0) {
    redirect("/carrinho");
  }

  if (!address || !cart.shipping_address_id) {
    redirect("/checkout");
  }

  if (!cart.shipping_method) {
    redirect("/checkout/expedicao");
  }

  const currency = cart.currency || "EUR";

  const productsTotal = items.reduce(
    (total, item) => total + Number(item.subtotal ?? 0),
    0,
  );

  const personalizationTotal = items.reduce(
    (total, item) =>
      total + Number(item.personalization_total ?? 0),
    0,
  );

  const preparationTotal = items.reduce(
    (total, item) =>
      total +
      Number(item.setup_cost ?? 0) +
      Number(item.extras_total ?? 0),
    0,
  );

  const taxableTotal = Math.max(
    0,
    productsTotal +
      personalizationTotal +
      preparationTotal +
      Number(cart.shipping_total ?? 0) -
      Number(cart.discount_total ?? 0),
  );

  const taxRate = determineTaxRate(address);
  const taxTotal = Number((taxableTotal * taxRate).toFixed(2));
  const grandTotal = Number((taxableTotal + taxTotal).toFixed(2));

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-10">
      <section className="mx-auto max-w-7xl">
        <Link
          href="/checkout/expedicao"
          className="inline-flex items-center text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar à expedição
        </Link>

        <div className="mt-8 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-3">
            {["Destino", "Expedição"].map((step) => (
              <div
                key={step}
                className="rounded-2xl bg-emerald-50 p-4 text-emerald-800"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white">
                    <Check className="h-4 w-4" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold">{step}</p>
                    <p className="mt-1 text-xs text-emerald-700">
                      Concluído
                    </p>
                  </div>
                </div>
              </div>
            ))}

            <div className="rounded-2xl bg-neutral-950 p-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-semibold text-neutral-950">
                  3
                </div>

                <div>
                  <p className="text-sm font-semibold">Pagamento</p>
                  <p className="mt-1 text-xs text-neutral-300">
                    Revisão e pagamento
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
          <section className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
              Passo 3 de 3
            </p>

            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-neutral-950">
              Rever e pagar
            </h1>

            <p className="mt-4 leading-7 text-neutral-600">
              Confirma todos os dados antes de avançar para o
              pagamento seguro.
            </p>

            <div className="mt-8 space-y-5">
              <div className="rounded-3xl bg-neutral-50 p-5">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-neutral-500" />
                  <h2 className="font-semibold text-neutral-950">
                    Destino
                  </h2>
                </div>

                <p className="mt-4 text-sm leading-6 text-neutral-600">
                  {address.company_name ?? address.contact_name}
                  <br />
                  {address.address_line_1}
                  {address.address_line_2
                    ? `, ${address.address_line_2}`
                    : ""}
                  <br />
                  {address.postal_code} {address.city}
                  {address.district ? ` · ${address.district}` : ""}
                  <br />
                  {address.country_code}
                </p>
              </div>

              <div className="rounded-3xl bg-neutral-50 p-5">
                <div className="flex items-center gap-3">
                  <Truck className="h-5 w-5 text-neutral-500" />
                  <h2 className="font-semibold text-neutral-950">
                    Expedição
                  </h2>
                </div>

                <p className="mt-4 text-sm text-neutral-600">
                  {cart.shipping_method_name ??
                    "Método de expedição selecionado"}
                </p>

                {cart.requested_delivery_date ? (
                  <p className="mt-2 text-sm text-neutral-600">
                    Data pretendida:{" "}
                    {new Intl.DateTimeFormat("pt-PT").format(
                      new Date(
                        `${cart.requested_delivery_date}T12:00:00`,
                      ),
                    )}
                  </p>
                ) : null}
              </div>
            </div>

            <CheckoutPaymentForm cartId={cart.id} />
          </section>

          <aside className="h-fit rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm lg:sticky lg:top-28">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-neutral-950">
                Total da encomenda
              </h2>

              <CreditCard className="h-5 w-5 text-neutral-400" />
            </div>

            <div className="mt-6 divide-y divide-neutral-100">
              {items.map((item) => (
                <article key={item.id} className="py-4">
                  <div className="flex gap-3">
                    <Package className="mt-1 h-4 w-4 shrink-0 text-neutral-400" />

                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-neutral-950">
                        {item.product_name}
                      </p>

                      <p className="mt-1 text-sm text-neutral-500">
                        {item.quantity.toLocaleString("pt-PT")} un.
                      </p>

                      {item.personalization_required ? (
                        <p className="mt-2 text-xs leading-5 text-neutral-500">
                          {item.customization_location_name ??
                            "Personalização"}
                          {item.customization_technique_name
                            ? ` · ${item.customization_technique_name}`
                            : ""}
                        </p>
                      ) : null}
                    </div>

                    <p className="text-sm font-semibold text-neutral-950">
                      {formatPrice(item.total, currency)}
                    </p>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-5 space-y-3 border-t border-neutral-200 pt-5 text-sm text-neutral-600">
              <div className="flex justify-between gap-4">
                <span>Produtos</span>
                <span className="font-semibold text-neutral-950">
                  {formatPrice(productsTotal, currency)}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span>Personalização</span>
                <span className="font-semibold text-neutral-950">
                  {formatPrice(personalizationTotal, currency)}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span>Preparação e extras</span>
                <span className="font-semibold text-neutral-950">
                  {formatPrice(preparationTotal, currency)}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span>Expedição</span>
                <span className="font-semibold text-neutral-950">
                  {formatPrice(cart.shipping_total, currency)}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span>IVA ({Math.round(taxRate * 100)}%)</span>
                <span className="font-semibold text-neutral-950">
                  {formatPrice(taxTotal, currency)}
                </span>
              </div>

              <div className="border-t border-neutral-200 pt-4">
                <div className="flex justify-between gap-4 text-lg">
                  <span className="font-semibold text-neutral-950">
                    Total a pagar
                  </span>

                  <span className="font-semibold text-neutral-950">
                    {formatPrice(grandTotal, currency)}
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}