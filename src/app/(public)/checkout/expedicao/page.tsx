import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Check,
  LockKeyhole,
  MapPin,
  Package,
  Truck,
  WalletCards,
} from "lucide-react";
import CheckoutShippingForm, {
  type CheckoutShippingMethod,
} from "@/components/checkout/CheckoutShippingForm";
import RemoveCartItemButton from "@/components/cart/RemoveCartItemButton";
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

type CustomerAddress = {
  id: string;
  company_name: string | null;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  address_line_1: string;
  address_line_2: string | null;
  postal_code: string;
  city: string;
  district: string | null;
  country_code: string;
};

type Cart = {
  id: string;
  user_id: string | null;
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
  shipping_address_id: string | null;
  shipping_method: CheckoutShippingMethod | null;
  requested_delivery_date: string | null;
  accepts_delivery_after_date: boolean;
  internal_reference: string | null;
  shipping_notes: string | null;
  customer_addresses: CustomerAddress | null;
  cart_items: CartItem[] | null;
};

function formatPrice(value: number, currency: string): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency,
  }).format(Number(value ?? 0));
}

function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}

export default async function CheckoutShippingPage() {
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
        user_id,
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
        shipping_address_id,
        shipping_method,
        requested_delivery_date,
        accepts_delivery_after_date,
        internal_reference,
        shipping_notes,
        customer_addresses!carts_shipping_address_id_fkey (
          id,
          company_name,
          contact_name,
          contact_email,
          contact_phone,
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

  if (items.length === 0) {
    redirect("/carrinho");
  }

  if (!cart.shipping_address_id || !cart.customer_addresses) {
    redirect("/checkout");
  }

  const currency = cart.currency || "EUR";

  const productsTotal = roundMoney(
    items.reduce(
      (total, item) => total + Number(item.subtotal ?? 0),
      0,
    ),
  );

  const personalizationTotal = roundMoney(
    items.reduce(
      (total, item) =>
        total + Number(item.personalization_total ?? 0),
      0,
    ),
  );

  const setupTotal = roundMoney(
    items.reduce(
      (total, item) => total + Number(item.setup_cost ?? 0),
      0,
    ),
  );

  const extrasTotal = roundMoney(
    items.reduce(
      (total, item) => total + Number(item.extras_total ?? 0),
      0,
    ),
  );

  const merchandiseTotal = roundMoney(
    productsTotal +
      personalizationTotal +
      setupTotal +
      extrasTotal -
      Number(cart.discount_total ?? 0),
  );

  const address = cart.customer_addresses;

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-10">
      <section className="mx-auto max-w-7xl">
        <Link
          href="/checkout"
          className="inline-flex items-center text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao destino
        </Link>

        <div className="mt-8 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-800">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white">
                  <Check className="h-4 w-4" />
                </div>

                <div>
                  <p className="text-sm font-semibold">
                    Destino
                  </p>

                  <p className="mt-1 text-xs text-emerald-700">
                    Concluído
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-neutral-950 p-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-semibold text-neutral-950">
                  2
                </div>

                <div>
                  <p className="text-sm font-semibold">
                    Expedição
                  </p>

                  <p className="mt-1 text-xs text-neutral-300">
                    Transporte e prazo
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-neutral-100 p-4 text-neutral-500">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-semibold">
                  3
                </div>

                <div>
                  <p className="text-sm font-semibold">
                    Pagamento
                  </p>

                  <p className="mt-1 text-xs">
                    Revisão e pagamento
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
          <section className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-neutral-100 p-3">
                <Truck className="h-6 w-6 text-neutral-600" />
              </div>

              <div>
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
                  Passo 2 de 3
                </p>

                <h1 className="mt-3 text-4xl font-semibold tracking-tight text-neutral-950">
                  Expedição
                </h1>

                <p className="mt-4 max-w-3xl leading-7 text-neutral-600">
                  Escolhe o método de transporte, confirma o
                  prazo estimado e indica as referências
                  necessárias para a entrega.
                </p>
              </div>
            </div>

            <CheckoutShippingForm
              cartId={cart.id}
              currency={currency}
              merchandiseTotal={merchandiseTotal}
              initialShippingMethod={cart.shipping_method}
              initialRequestedDeliveryDate={
                cart.requested_delivery_date ?? ""
              }
              initialAcceptsDeliveryAfterDate={
                cart.accepts_delivery_after_date ?? true
              }
              initialInternalReference={
                cart.internal_reference ?? ""
              }
              initialShippingNotes={
                cart.shipping_notes ?? ""
              }
            />
          </section>

          <aside className="h-fit lg:sticky lg:top-28">
            <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.16em] text-neutral-500">
                    Destino
                  </p>

                  <h2 className="mt-2 text-xl font-semibold text-neutral-950">
                    Morada de entrega
                  </h2>
                </div>

                <MapPin className="h-5 w-5 text-neutral-400" />
              </div>

              <div className="mt-5 rounded-2xl bg-neutral-50 p-4">
                <p className="font-semibold text-neutral-950">
                  {address.company_name ??
                    address.contact_name}
                </p>

                {address.company_name ? (
                  <p className="mt-1 text-sm text-neutral-600">
                    {address.contact_name}
                  </p>
                ) : null}

                <p className="mt-3 text-sm leading-6 text-neutral-600">
                  {address.address_line_1}
                  {address.address_line_2
                    ? `, ${address.address_line_2}`
                    : ""}
                  <br />
                  {address.postal_code} {address.city}
                  {address.district
                    ? ` · ${address.district}`
                    : ""}
                  <br />
                  {address.country_code}
                </p>

                {address.contact_phone ? (
                  <p className="mt-3 text-sm text-neutral-600">
                    {address.contact_phone}
                  </p>
                ) : null}
              </div>

              <Link
                href="/checkout"
                className="mt-4 inline-flex text-sm font-semibold text-neutral-950 underline-offset-4 hover:underline"
              >
                Alterar destino
              </Link>
            </div>

            <div className="mt-5 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.16em] text-neutral-500">
                    Encomenda
                  </p>

                  <h2 className="mt-2 text-xl font-semibold text-neutral-950">
                    Resumo
                  </h2>
                </div>

                <LockKeyhole className="h-5 w-5 text-neutral-400" />
              </div>

              <div className="mt-6 divide-y divide-neutral-100">
                {items.map((item) => (
                  <article key={item.id} className="py-5">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-neutral-100 p-2">
                        <Package className="h-4 w-4 text-neutral-500" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-neutral-950">
                          {item.product_name}
                        </p>

                        <p className="mt-1 text-sm text-neutral-500">
                          {item.quantity.toLocaleString("pt-PT")} un.
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-3">
                        <p className="text-sm font-semibold text-neutral-950">
                          {formatPrice(item.total, currency)}
                        </p>

                        <RemoveCartItemButton
                          itemId={item.id}
                          productName={item.product_name}
                          returnTo="/checkout/expedicao"
                        />
                      </div>
                    </div>

                    {item.personalization_required ? (
                      <div className="mt-4 rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-600">
                        <div className="flex items-center gap-2 font-semibold text-neutral-950">
                          <Check className="h-4 w-4 text-emerald-600" />
                          Personalização configurada
                        </div>

                        <dl className="mt-3 space-y-2">
                          <div className="flex justify-between gap-4">
                            <dt>Local</dt>

                            <dd className="text-right font-medium text-neutral-950">
                              {item.customization_location_name ??
                                "A confirmar"}
                            </dd>
                          </div>

                          <div className="flex justify-between gap-4">
                            <dt>Técnica</dt>

                            <dd className="text-right font-medium text-neutral-950">
                              {item.customization_technique_name ??
                                "A confirmar"}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>

              <div className="mt-6 space-y-3 border-t border-neutral-200 pt-5 text-sm text-neutral-600">
                <div className="flex justify-between gap-4">
                  <span>Produtos</span>

                  <span className="font-semibold text-neutral-950">
                    {formatPrice(productsTotal, currency)}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span>Personalização</span>

                  <span className="font-semibold text-neutral-950">
                    {formatPrice(
                      personalizationTotal,
                      currency,
                    )}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span>Preparação</span>

                  <span className="font-semibold text-neutral-950">
                    {formatPrice(setupTotal, currency)}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span>Extras</span>

                  <span className="font-semibold text-neutral-950">
                    {formatPrice(extrasTotal, currency)}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span>Expedição</span>

                  <span className="font-semibold text-neutral-500">
                    A selecionar
                  </span>
                </div>

                <div className="border-t border-neutral-200 pt-4">
                  <div className="flex justify-between gap-4 text-base">
                    <span className="font-semibold text-neutral-950">
                      Total atual
                    </span>

                    <span className="font-semibold text-neutral-950">
                      {formatPrice(
                        merchandiseTotal,
                        currency,
                      )}
                    </span>
                  </div>

                  <p className="mt-2 text-xs leading-5 text-neutral-500">
                    Valor antes de transporte e IVA.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-3xl bg-neutral-950 p-5 text-white shadow-sm">
              <div className="flex items-start gap-3">
                <WalletCards className="mt-0.5 h-5 w-5 text-neutral-300" />

                <div>
                  <p className="text-sm font-semibold">
                    Próximo passo
                  </p>

                  <p className="mt-1 text-sm leading-6 text-neutral-300">
                    No pagamento poderás rever todos os valores,
                    confirmar os dados fiscais e efetuar o
                    pagamento seguro.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
