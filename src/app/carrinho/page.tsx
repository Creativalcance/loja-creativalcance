import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowLeft, ShoppingCart } from "lucide-react";
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
  personalization_notes: string | null;
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

const CART_SESSION_COOKIE = "loja_creativ_cart_session";

function formatPrice(value: number, currency: string): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency,
  }).format(value);
}

async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

export default async function CartPage() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(CART_SESSION_COOKIE)?.value ?? null;
  const userId = await getCurrentUserId();

  const supabaseAdmin = createSupabaseAdminClient();

  let cart: Cart | null = null;

  if (userId || sessionId) {
    const query = supabaseAdmin
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
            total,
            personalization_notes
          )
        `,
      )
      .eq("status", "active")
      .limit(1);

    const { data } = userId
      ? await query.eq("user_id", userId).maybeSingle<Cart>()
      : await query.eq("session_id", sessionId).maybeSingle<Cart>();

    cart = data ?? null;
  }

  const items = cart?.cart_items ?? [];
  const currency = cart?.currency ?? "EUR";

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-12">
      <section className="mx-auto max-w-5xl">
        <Link
          href="/pesquisa"
          className="inline-flex items-center text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Continuar a comprar
        </Link>

        <div className="mt-8">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
            Loja Creativ
          </p>

          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-950">
            Carrinho
          </h1>

          <p className="mt-4 max-w-3xl text-neutral-600">
            Revê os produtos antes de avançar para checkout. O pagamento online
            será implementado na etapa seguinte com Stripe.
          </p>
        </div>

        {items.length > 0 ? (
          <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section className="space-y-4">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-col justify-between gap-5 md:flex-row">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-400">
                        {item.product_sku}
                      </p>

                      <h2 className="mt-2 text-xl font-semibold text-neutral-950">
                        {item.product_name}
                      </h2>

                      <p className="mt-3 text-sm text-neutral-600">
                        Quantidade:{" "}
                        <span className="font-semibold text-neutral-950">
                          {item.quantity.toLocaleString("pt-PT")}
                        </span>
                      </p>

                      {item.personalization_notes ? (
                        <p className="mt-3 rounded-2xl bg-neutral-50 p-3 text-sm leading-6 text-neutral-600">
                          {item.personalization_notes}
                        </p>
                      ) : null}
                    </div>

                    <div className="text-sm text-neutral-600 md:text-right">
                      <p>
                        Unitário:{" "}
                        <span className="font-semibold text-neutral-950">
                          {formatPrice(item.unit_price, currency)}
                        </span>
                      </p>

                      <p className="mt-2">
                        Personalização:{" "}
                        <span className="font-semibold text-neutral-950">
                          {formatPrice(item.personalization_total, currency)}
                        </span>
                      </p>

                      <p className="mt-2">
                        Setup:{" "}
                        <span className="font-semibold text-neutral-950">
                          {formatPrice(item.setup_cost, currency)}
                        </span>
                      </p>

                      <p className="mt-4 text-lg font-semibold text-neutral-950">
                        {formatPrice(item.total, currency)}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </section>

            <aside className="h-fit rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-neutral-950">
                Resumo
              </h2>

              <div className="mt-6 space-y-3 text-sm text-neutral-600">
                <div className="flex justify-between gap-4">
                  <span>Produtos</span>
                  <span className="font-semibold text-neutral-950">
                    {formatPrice(cart?.subtotal ?? 0, currency)}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span>Personalização</span>
                  <span className="font-semibold text-neutral-950">
                    {formatPrice(cart?.personalization_total ?? 0, currency)}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span>Setup</span>
                  <span className="font-semibold text-neutral-950">
                    {formatPrice(cart?.setup_total ?? 0, currency)}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span>IVA</span>
                  <span className="font-semibold text-neutral-950">
                    {formatPrice(cart?.tax_total ?? 0, currency)}
                  </span>
                </div>

                <div className="border-t border-neutral-200 pt-4">
                  <div className="flex justify-between gap-4 text-base">
                    <span className="font-semibold text-neutral-950">
                      Total
                    </span>
                    <span className="font-semibold text-neutral-950">
                      {formatPrice(cart?.grand_total ?? 0, currency)}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled
                className="mt-6 inline-flex w-full cursor-not-allowed items-center justify-center rounded-2xl bg-neutral-300 px-6 py-4 text-sm font-semibold text-white"
              >
                Checkout em preparação
              </button>

              <p className="mt-4 text-xs leading-5 text-neutral-500">
                Na próxima etapa vamos ligar este carrinho ao Stripe e criar a
                encomenda automaticamente após pagamento.
              </p>
            </aside>
          </div>
        ) : (
          <div className="mt-10 rounded-3xl border border-neutral-200 bg-white p-12 text-center shadow-sm">
            <ShoppingCart className="mx-auto h-10 w-10 text-neutral-400" />

            <h2 className="mt-5 text-xl font-semibold text-neutral-950">
              O carrinho está vazio
            </h2>

            <p className="mt-3 text-neutral-600">
              Adiciona produtos ao carrinho para preparar a tua encomenda.
            </p>

            <Link
              href="/pesquisa"
              className="mt-8 inline-flex rounded-2xl bg-neutral-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              Procurar produtos
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}