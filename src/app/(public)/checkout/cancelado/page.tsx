import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { localizePath } from "@/lib/i18n/config";
import { getCurrentLocale } from "@/lib/i18n/server";

export default async function CheckoutCancelledPage() {
  const locale = await getCurrentLocale();
  const text = (locale === "es" ? ({
    cancelled: "Pago cancelado",
    title: "El pedido todav\u00EDa no se ha pagado",
    help: "No se ha confirmado ning\u00FAn pago. Puedes volver al proceso de compra, revisar los datos e intentarlo de nuevo.",
    retry: "Intentar de nuevo",
    cart: "Volver al carrito",
}) : locale === "de" ? ({
    cancelled: "Zahlung abgebrochen",
    title: "Die Bestellung wurde noch nicht bezahlt",
    help: "Es wurde keine Zahlung best\u00E4tigt. Sie k\u00F6nnen zur Kasse zur\u00FCckkehren, die Angaben pr\u00FCfen und es erneut versuchen.",
    retry: "Erneut versuchen",
    cart: "Zur\u00FCck zum Warenkorb",
}) : locale === "it" ? ({
    cancelled: "Pagamento annullato",
    title: "L'ordine non \u00E8 ancora stato pagato",
    help: "Nessun pagamento \u00E8 stato confermato. Puoi tornare alla cassa, controllare i dati e riprovare.",
    retry: "Riprova",
    cart: "Torna al carrello",
}) : locale === "en" ? {
    cancelled: "Payment cancelled",
    title: "The order has not been paid yet",
    help: "No payment was confirmed. You can return to checkout, review the details and try again.",
    retry: "Try again",
    cart: "Back to cart",
  } : locale === "fr" ? {
    cancelled: "Paiement annulé",
    title: "La commande n’a pas encore été payée",
    help: "Aucun paiement n’a été confirmé. Vous pouvez revenir au paiement, vérifier les informations et réessayer.",
    retry: "Réessayer",
    cart: "Retour au panier",
  } : {
    cancelled: "Pagamento cancelado",
    title: "A encomenda ainda não foi paga",
    help: "Não foi efetuada qualquer confirmação de pagamento. Podes regressar ao checkout, rever os dados e tentar novamente.",
    retry: "Tentar novamente",
    cart: "Voltar ao carrinho",
  });
  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-12">
      <section className="mx-auto max-w-3xl rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
        <AlertCircle className="mx-auto h-14 w-14 text-amber-500" />

        <p className="mt-6 text-sm font-medium uppercase tracking-[0.2em] text-amber-600">
          {text.cancelled}
        </p>

        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-950">
          {text.title}
        </h1>

        <p className="mx-auto mt-4 max-w-2xl leading-7 text-neutral-600">
          {text.help}
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href={localizePath("/checkout/pagamento", locale)}
            className="inline-flex items-center justify-center rounded-2xl bg-neutral-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            {text.retry}
          </Link>

          <Link
            href={localizePath("/carrinho", locale)}
            className="inline-flex items-center justify-center rounded-2xl border border-neutral-300 bg-white px-6 py-3 text-sm font-semibold text-neutral-950 transition hover:border-neutral-950"
          >
            {text.cart}
          </Link>
        </div>
      </section>
    </main>
  );
}
