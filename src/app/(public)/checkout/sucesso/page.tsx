import Link from "next/link";
import { localizePath } from "@/lib/i18n/config";
import { getCurrentLocale } from "@/lib/i18n/server";
import { CheckCircle2, Clock3 } from "lucide-react";
import Ga4PurchaseTracker from "@/components/analytics/Ga4PurchaseTracker";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type CheckoutSuccessPageProps = {
  searchParams?: Promise<{
    session_id?: string;
  }>;
};

type CheckoutRecord = {
  order_id: string | null;
  status: string;
  amount_total: number;
  currency: string;
  orders: {
    order_number: string;
    payment_status: string;
    status: string;
  } | null;
};

type PurchaseOrderItem = {
  product_sku: string;
  product_name: string;
  quantity: number;
  total: number;
};

function formatPrice(value: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(Number(value ?? 0));
}

export default async function CheckoutSuccessPage({
  searchParams,
}: CheckoutSuccessPageProps) {
  const locale = await getCurrentLocale();
  const text =
    locale === "en"
      ? {
          confirmed: "Payment confirmed",
          confirming: "Payment being confirmed",
          thanks: "Thank you for your order",
          received: "We have received your payment",
          paidHelp: "Your order has been registered and will now be validated by our team before it is sent to production.",
          pendingHelp: "Stripe is confirming the payment. The order status will be updated automatically.",
          orderNumber: "Order number",
          total: "Total",
          orders: "View orders",
          continueShopping: "Continue shopping",
          intlLocale: "en-GB",
        }
      : locale === "fr"
        ? {
            confirmed: "Paiement confirmé",
            confirming: "Paiement en cours de confirmation",
            thanks: "Merci pour votre commande",
            received: "Nous avons reçu votre paiement",
            paidHelp: "Votre commande a été enregistrée et sera maintenant validée par notre équipe avant son envoi en production.",
            pendingHelp: "Stripe confirme le paiement. Le statut de la commande sera mis à jour automatiquement.",
            orderNumber: "Numéro de commande",
            total: "Total",
            orders: "Voir les commandes",
            continueShopping: "Continuer mes achats",
            intlLocale: "fr-FR",
          }
        : {
            confirmed: "Pagamento confirmado",
            confirming: "Pagamento em confirmação",
            thanks: "Obrigado pela tua encomenda",
            received: "Recebemos o teu pagamento",
            paidHelp: "A encomenda foi registada e será agora validada pela nossa equipa antes do envio para produção.",
            pendingHelp: "A Stripe está a confirmar o pagamento. O estado da encomenda será atualizado automaticamente.",
            orderNumber: "Número da encomenda",
            total: "Total",
            orders: "Ver encomendas",
            continueShopping: "Continuar a comprar",
            intlLocale: "pt-PT",
          };
  const resolvedSearchParams = await searchParams;
  const sessionId =
    resolvedSearchParams?.session_id?.trim() ?? null;

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let checkout: CheckoutRecord | null = null;
  let purchaseOrderItems: PurchaseOrderItem[] = [];

  if (sessionId && user) {
    const supabaseAdmin = createSupabaseAdminClient();

    const { data } = await supabaseAdmin
      .from("checkout_sessions")
      .select(
        `
          order_id,
          status,
          amount_total,
          currency,
          orders (
            order_number,
            payment_status,
            status
          )
        `,
      )
      .eq("provider_session_id", sessionId)
      .eq("user_id", user.id)
      .maybeSingle();

    checkout = data as unknown as CheckoutRecord | null;

    if (checkout?.order_id) {
      const { data: orderItemsData } = await supabaseAdmin
        .from("order_items")
        .select("product_sku,product_name,quantity,total")
        .eq("order_id", checkout.order_id);

      purchaseOrderItems = (orderItemsData ?? []) as PurchaseOrderItem[];
    }
  }

  const isPaid =
    checkout?.status === "completed" ||
    checkout?.orders?.payment_status === "paid";

  const purchaseItems = purchaseOrderItems.map((item) => {
    const quantity = Math.max(1, Number(item.quantity ?? 1));
    const total = Number(item.total ?? 0);

    return {
      item_id: item.product_sku,
      item_name: item.product_name,
      price: Number((total / quantity).toFixed(2)),
      quantity,
    };
  });

  const purchaseValue = Number(
    purchaseOrderItems
      .reduce((sum, item) => sum + Number(item.total ?? 0), 0)
      .toFixed(2),
  );

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-12">
      {isPaid && checkout?.orders?.order_number && purchaseItems.length > 0 ? (
        <Ga4PurchaseTracker
          transactionId={checkout.orders.order_number}
          currency={checkout.currency || "EUR"}
          value={purchaseValue}
          items={purchaseItems}
        />
      ) : null}
      <section className="mx-auto max-w-3xl rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
        {isPaid ? (
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
        ) : (
          <Clock3 className="mx-auto h-14 w-14 text-amber-500" />
        )}

        <p
          className={`mt-6 text-sm font-medium uppercase tracking-[0.2em] ${
            isPaid ? "text-emerald-600" : "text-amber-600"
          }`}
        >
          {isPaid
            ? text.confirmed
            : text.confirming}
        </p>

        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-950">
          {isPaid
            ? text.thanks
            : text.received}
        </h1>

        <p className="mx-auto mt-4 max-w-2xl leading-7 text-neutral-600">
          {isPaid
            ? text.paidHelp
            : text.pendingHelp}
        </p>

        {checkout?.orders?.order_number ? (
          <div className="mt-8 rounded-2xl bg-neutral-50 p-5">
            <p className="text-sm text-neutral-500">
              {text.orderNumber}
            </p>

            <p className="mt-1 text-xl font-semibold text-neutral-950">
              {checkout.orders.order_number}
            </p>

            <p className="mt-4 text-sm text-neutral-500">
              {text.total}
            </p>

            <p className="mt-1 font-semibold text-neutral-950">
              {formatPrice(
                checkout.amount_total,
                checkout.currency,
                text.intlLocale,
              )}
            </p>
          </div>
        ) : null}

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href={localizePath("/area-cliente/encomendas", locale)}
            className="inline-flex items-center justify-center rounded-2xl bg-neutral-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            {text.orders}
          </Link>

          <Link
            href={localizePath("/", locale)}
            className="inline-flex items-center justify-center rounded-2xl border border-neutral-300 bg-white px-6 py-3 text-sm font-semibold text-neutral-950 transition hover:border-neutral-950"
          >
            {text.continueShopping}
          </Link>
        </div>
      </section>
    </main>
  );
}
