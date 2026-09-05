import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import RemoveCartItemButton from "@/components/cart/RemoveCartItemButton";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { localizePath, SITE_LOCALES } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import { getCurrentLocale } from "@/lib/i18n/server";

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

function formatPrice(value: number, currency: string, intlLocale: string): string {
  return new Intl.NumberFormat(intlLocale, {
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
  const locale = await getCurrentLocale();
  const labels = getMessages(locale);
  const intlLocale = SITE_LOCALES[locale].intlLocale;
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
          href={localizePath("/", locale)}
          className="inline-flex items-center text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {labels.cart.continueShopping}
        </Link>

        <div className="mt-8">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
            360 Merchandising
          </p>

          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-950">
            {labels.cart.title}
          </h1>

          <p className="mt-4 max-w-3xl text-neutral-600">
            {labels.cart.intro}
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
                        {labels.common.quantity}:{" "}
                        <span className="font-semibold text-neutral-950">
                          {item.quantity.toLocaleString(intlLocale)}
                        </span>
                      </p>

                      {item.personalization_notes ? (
                        <p className="mt-3 rounded-2xl bg-neutral-50 p-3 text-sm leading-6 text-neutral-600">
                          {item.personalization_notes}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-col items-start text-sm text-neutral-600 md:items-end md:text-right">
                      <p>
                        {labels.cart.unit}:{" "}
                        <span className="font-semibold text-neutral-950">
                          {formatPrice(item.unit_price, currency, intlLocale)}
                        </span>
                      </p>

                      <p className="mt-2">
                        {labels.common.personalization}:{" "}
                        <span className="font-semibold text-neutral-950">
                          {formatPrice(item.personalization_total, currency, intlLocale)}
                        </span>
                      </p>

                      <p className="mt-2">
                        {labels.common.setup}:{" "}
                        <span className="font-semibold text-neutral-950">
                          {formatPrice(item.setup_cost, currency, intlLocale)}
                        </span>
                      </p>

                      <p className="mt-4 text-lg font-semibold text-neutral-950">
                        {formatPrice(item.total, currency, intlLocale)}
                      </p>

                      <div className="mt-5">
                        <RemoveCartItemButton
                          itemId={item.id}
                          productName={item.product_name}
                          returnTo={localizePath("/carrinho", locale)}
                        />
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </section>

            <aside className="h-fit rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-neutral-950">
                {labels.cart.summary}
              </h2>

              <div className="mt-6 space-y-3 text-sm text-neutral-600">
                <div className="flex justify-between gap-4">
                  <span>{labels.common.products}</span>
                  <span className="font-semibold text-neutral-950">
                    {formatPrice(cart?.subtotal ?? 0, currency, intlLocale)}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span>{labels.common.personalization}</span>
                  <span className="font-semibold text-neutral-950">
                    {formatPrice(cart?.personalization_total ?? 0, currency, intlLocale)}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span>{labels.common.setup}</span>
                  <span className="font-semibold text-neutral-950">
                    {formatPrice(cart?.setup_total ?? 0, currency, intlLocale)}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span>{labels.common.vat}</span>
                  <span className="font-semibold text-neutral-950">
                    {formatPrice(cart?.tax_total ?? 0, currency, intlLocale)}
                  </span>
                </div>

                <div className="border-t border-neutral-200 pt-4">
                  <div className="flex justify-between gap-4 text-base">
                    <span className="font-semibold text-neutral-950">
                      {labels.common.total}
                    </span>
                    <span className="font-semibold text-neutral-950">
                      {formatPrice(cart?.grand_total ?? 0, currency, intlLocale)}
                    </span>
                  </div>
                </div>
              </div>

              <Link
  href={localizePath("/checkout", locale)}
  className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-neutral-950 px-6 py-4 text-sm font-semibold text-white transition hover:bg-neutral-800"
>
  {labels.cart.checkout}
</Link>

              <p className="mt-4 text-xs leading-5 text-neutral-500">
  {labels.cart.secure}
</p>
            </aside>
          </div>
        ) : (
          <div className="mt-10 rounded-3xl border border-neutral-200 bg-white p-12 text-center shadow-sm">
            <ShoppingCart className="mx-auto h-10 w-10 text-neutral-400" />

            <h2 className="mt-5 text-xl font-semibold text-neutral-950">
              {labels.cart.empty}
            </h2>

            <p className="mt-3 text-neutral-600">
              {labels.cart.emptyText}
            </p>

            <Link
              href={localizePath("/pesquisa", locale)}
              className="mt-8 inline-flex rounded-2xl bg-neutral-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              {labels.cart.find}
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
