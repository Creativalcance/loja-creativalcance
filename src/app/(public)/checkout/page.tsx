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
import CheckoutForm, {
  type CheckoutSavedAddress,
} from "@/components/checkout/CheckoutForm";
import Ga4BeginCheckoutTracker from "@/components/analytics/Ga4BeginCheckoutTracker";
import RemoveCartItemButton from "@/components/cart/RemoveCartItemButton";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type CartItem = {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  personalization_unit_price: number;
  setup_cost: number;
  extras_total: number;
  subtotal: number;
  personalization_total: number;
  total: number;
  customization_location_name: string | null;
  customization_technique_name: string | null;
  logo_file_name: string | null;
  personalization_required: boolean;
};

type Cart = {
  id: string;
  user_id: string | null;
  currency: string;
  subtotal: number;
  personalization_total: number;
  setup_total: number;
  shipping_total: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  shipping_address_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  company_name: string | null;
  company_tax_id: string | null;
  artwork_email: string | null;
  customer_notes: string | null;
  checkout_step: string;
  cart_items: CartItem[] | null;
};

type Profile = {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  tax_id: string | null;
};

type CustomerAddress = CheckoutSavedAddress;

function formatPrice(value: number, currency: string): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency,
  }).format(Number(value ?? 0));
}

function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}

export default async function CheckoutPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const supabaseAdmin = createSupabaseAdminClient();

  const { data: profileData } = await supabaseAdmin
    .from("profiles")
    .select(
      `
        full_name,
        email,
        phone,
        company_name,
        tax_id
      `,
    )
    .eq("id", user.id)
    .maybeSingle<Profile>();

  const { data: cartData } = await supabaseAdmin
    .from("carts")
    .select(
      `
        id,
        user_id,
        currency,
        subtotal,
        personalization_total,
        setup_total,
        shipping_total,
        discount_total,
        tax_total,
        grand_total,
        shipping_address_id,
        customer_name,
        customer_email,
        customer_phone,
        company_name,
        company_tax_id,
        artwork_email,
        customer_notes,
        checkout_step,
        cart_items (
          id,
          product_name,
          quantity,
          unit_price,
          personalization_unit_price,
          setup_cost,
          extras_total,
          subtotal,
          personalization_total,
          total,
          customization_location_name,
          customization_technique_name,
          logo_file_name,
          personalization_required
        )
      `,
    )
    .eq("status", "active")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle<Cart>();

  const cart = cartData ?? null;
  const items = cart?.cart_items ?? [];

  if (!cart || items.length === 0) {
    redirect("/carrinho");
  }

  const { data: addressesData } = await supabaseAdmin
    .from("customer_addresses")
    .select(
      `
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
        country_code,
        is_default
      `,
    )
    .eq("user_id", user.id)
    .eq("address_type", "shipping")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  const savedAddresses =
    (addressesData as CustomerAddress[] | null) ?? [];

  const currency = cart.currency || "EUR";

  const setupTotal = roundMoney(
    items.reduce(
      (total, item) =>
        total + Number(item.setup_cost ?? 0),
      0,
    ),
  );

  const extrasTotal = roundMoney(
    items.reduce(
      (total, item) =>
        total + Number(item.extras_total ?? 0),
      0,
    ),
  );

  const currentTotal = roundMoney(
    items.reduce(
      (total, item) =>
        total + Number(item.total ?? 0),
      0,
    ),
  );

  const ga4Items = items.map((item) => ({
    item_name: item.product_name,
    price: Number(item.unit_price ?? 0),
    quantity: Number(item.quantity ?? 0),
  }));

  const profile = profileData ?? null;

  const customerName =
    cart.customer_name ??
    profile?.full_name ??
    "";

  const customerEmail =
    cart.customer_email ??
    profile?.email ??
    user.email ??
    "";

  const customerPhone =
    cart.customer_phone ??
    profile?.phone ??
    "";

  const companyName =
    cart.company_name ??
    profile?.company_name ??
    "";

  const companyTaxId =
    cart.company_tax_id ??
    profile?.tax_id ??
    "";

  const artworkEmail =
    cart.artwork_email ??
    customerEmail;

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-10">
      <Ga4BeginCheckoutTracker
        cartId={cart.id}
        currency={currency}
        value={currentTotal}
        items={ga4Items}
      />
      <section className="mx-auto max-w-7xl">
        <Link
          href="/carrinho"
          className="inline-flex items-center text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao carrinho
        </Link>

        <div className="mt-8 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-neutral-950 p-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-semibold text-neutral-950">
                  1
                </div>

                <div>
                  <p className="text-sm font-semibold">
                    Destino
                  </p>

                  <p className="mt-1 text-xs text-neutral-300">
                    Dados e morada
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-neutral-100 p-4 text-neutral-500">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-semibold text-neutral-500">
                  2
                </div>

                <div>
                  <p className="text-sm font-semibold">
                    Expedição
                  </p>

                  <p className="mt-1 text-xs">
                    Transporte e prazo
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-neutral-100 p-4 text-neutral-500">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-semibold text-neutral-500">
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
                <MapPin className="h-6 w-6 text-neutral-600" />
              </div>

              <div>
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
                  Passo 1 de 3
                </p>

                <h1 className="mt-3 text-4xl font-semibold tracking-tight text-neutral-950">
                  Destino da encomenda
                </h1>

                <p className="mt-4 max-w-3xl leading-7 text-neutral-600">
                  Confirma os dados do cliente e indica a
                  morada onde pretendes receber a encomenda.
                </p>
              </div>
            </div>

            <CheckoutForm
              cartId={cart.id}
              customerName={customerName}
              customerEmail={customerEmail}
              customerPhone={customerPhone}
              companyName={companyName}
              companyTaxId={companyTaxId}
              artworkEmail={artworkEmail}
              customerNotes={cart.customer_notes ?? ""}
              selectedAddressId={cart.shipping_address_id}
              savedAddresses={savedAddresses}
            />
          </section>

          <aside className="h-fit lg:sticky lg:top-28">
            <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
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
                          returnTo="/checkout"
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

                          <div className="flex justify-between gap-4">
                            <dt>Logótipo</dt>

                            <dd className="max-w-48 truncate text-right font-medium text-neutral-950">
                              {item.logo_file_name ??
                                "Ainda não carregado"}
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
                    {formatPrice(cart.subtotal, currency)}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span>Personalização</span>

                  <span className="font-semibold text-neutral-950">
                    {formatPrice(
                      cart.personalization_total,
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
                  <span>Transporte</span>

                  <span className="font-semibold text-neutral-500">
                    A calcular
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span>IVA</span>

                  <span className="font-semibold text-neutral-500">
                    A calcular
                  </span>
                </div>

                <div className="border-t border-neutral-200 pt-4">
                  <div className="flex justify-between gap-4 text-base">
                    <span className="font-semibold text-neutral-950">
                      Total atual
                    </span>

                    <span className="font-semibold text-neutral-950">
                      {formatPrice(currentTotal, currency)}
                    </span>
                  </div>

                  <p className="mt-2 text-xs leading-5 text-neutral-500">
                    O transporte e o IVA serão adicionados
                    antes do pagamento.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <Truck className="mt-0.5 h-5 w-5 text-neutral-500" />

                <div>
                  <p className="text-sm font-semibold text-neutral-950">
                    Próximo passo
                  </p>

                  <p className="mt-1 text-sm leading-6 text-neutral-600">
                    Na expedição poderás escolher o método de
                    transporte, consultar o prazo e confirmar o
                    respetivo custo.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-3xl bg-neutral-950 p-5 text-white shadow-sm">
              <div className="flex items-start gap-3">
                <WalletCards className="mt-0.5 h-5 w-5 text-neutral-300" />

                <div>
                  <p className="text-sm font-semibold">
                    Pagamento seguro
                  </p>

                  <p className="mt-1 text-sm leading-6 text-neutral-300">
                    O pagamento só será pedido depois da
                    escolha do transporte e da revisão do
                    valor final.
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
