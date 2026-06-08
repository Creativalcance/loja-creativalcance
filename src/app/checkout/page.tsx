import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowLeft, CreditCard, LockKeyhole } from "lucide-react";
import SiteHeader from "@/components/layout/SiteHeader";
import CheckoutForm from "@/components/checkout/CheckoutForm";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CartItem = {
  id: string;
  product_sku: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  personalization_unit_price: number;
  setup_cost: number;
  subtotal: number;
  personalization_total: number;
  total: number;
};

type Cart = {
  id: string;
  subtotal: number;
  personalization_total: number;
  setup_total: number;
  shipping_total: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  currency: string;
  cart_items: CartItem[] | null;
};

type Profile = {
  full_name: string | null;
  email: string;
};

const CART_SESSION_COOKIE = "loja_creativ_cart_session";

function formatPrice(value: number, currency: string): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency,
  }).format(value);
}

export default async function CheckoutPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  const cookieStore = await cookies();
  const sessionId = cookieStore.get(CART_SESSION_COOKIE)?.value ?? null;

  const supabaseAdmin = createSupabaseAdminClient();

  const { data: cartData } = await supabaseAdmin
    .from("carts")
    .select(
      `
        id,
        subtotal,
        personalization_total,
        setup_total,
        shipping_total,
        discount_total,
        tax_total,
        grand_total,
        currency,
        cart_items (
          id,
          product_sku,
          product_name,
          quantity,
          unit_price,
          personalization_unit_price,
          setup_cost,
          subtotal,
          personalization_total,
          total
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

  const currency = cart.currency ?? "EUR";

  return (
    <>
      <SiteHeader />

      <main className="min-h-screen bg-neutral-50 px-6 py-10">
        <section className="mx-auto max-w-7xl">
          <Link
            href="/carrinho"
            className="inline-flex items-center text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao carrinho
          </Link>

          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
            <section className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
                Checkout seguro
              </p>

              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-950">
                Finalizar encomenda
              </h1>

              <p className="mt-4 max-w-3xl text-neutral-600">
                Confirma os dados de faturação e entrega. De seguida serás
                redireccionado para pagamento seguro por Stripe.
              </p>

              <CheckoutForm
                cartId={cart.id}
                customerName={profile?.full_name ?? ""}
                customerEmail={profile?.email ?? user.email ?? ""}
              />
            </section>

            <aside className="h-fit rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-neutral-950">
                  Resumo
                </h2>

                <LockKeyhole className="h-5 w-5 text-neutral-400" />
              </div>

              <div className="mt-6 divide-y divide-neutral-100">
                {items.map((item) => (
                  <article key={item.id} className="py-4">
                    <p className="font-semibold text-neutral-950">
                      {item.product_name}
                    </p>

                    <p className="mt-1 text-sm text-neutral-500">
                      {item.product_sku} ·{" "}
                      {item.quantity.toLocaleString("pt-PT")} un.
                    </p>

                    <p className="mt-2 text-sm font-semibold text-neutral-950">
                      {formatPrice(item.total, currency)}
                    </p>
                  </article>
                ))}
              </div>

              <div className="mt-6 space-y-3 text-sm text-neutral-600">
                <div className="flex justify-between gap-4">
                  <span>Produtos</span>
                  <span className="font-semibold text-neutral-950">
                    {formatPrice(cart.subtotal, currency)}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span>Personalização</span>
                  <span className="font-semibold text-neutral-950">
                    {formatPrice(cart.personalization_total, currency)}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span>Setup</span>
                  <span className="font-semibold text-neutral-950">
                    {formatPrice(cart.setup_total, currency)}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span>IVA / Portes</span>
                  <span className="font-semibold text-neutral-950">
                    Calculado no checkout
                  </span>
                </div>

                <div className="border-t border-neutral-200 pt-4">
                  <div className="flex justify-between gap-4 text-base">
                    <span className="font-semibold text-neutral-950">
                      Total actual
                    </span>

                    <span className="font-semibold text-neutral-950">
                      {formatPrice(cart.grand_total, currency)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-neutral-50 p-4 text-sm leading-6 text-neutral-600">
                <CreditCard className="mb-3 h-5 w-5 text-neutral-500" />
                O pagamento é processado por Stripe. A Loja Creativ será a
                entidade vendedora perante o cliente.
              </div>
            </aside>
          </div>
        </section>
      </main>
    </>
  );
}