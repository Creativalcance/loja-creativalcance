import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { localizePath } from "@/lib/i18n/config";
import { getCurrentLocale } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Contactos",
  description: "Contacte a equipa da 360 Merchandising.",
};

export default async function ContactsPage() {
  const locale = await getCurrentLocale();
  const copy = locale === "en"
    ? { eyebrow: "Contacts", title: "We are here to help", intro: "Talk to our team about products, customisation, orders or a tailored project.", address: "Address", phone: "Phone", email: "Email", quote: "Request a tailored quote" }
    : locale === "fr"
      ? { eyebrow: "Contacts", title: "Nous sommes à votre écoute", intro: "Contactez notre équipe pour toute question sur les produits, la personnalisation, les commandes ou un projet sur mesure.", address: "Adresse", phone: "Téléphone", email: "E-mail", quote: "Demander un devis personnalisé" }
      : { eyebrow: "Contactos", title: "Estamos aqui para ajudar", intro: "Fale com a nossa equipa sobre produtos, personalização, encomendas ou um projeto à medida.", address: "Morada", phone: "Telefone", email: "Email", quote: "Pedir orçamento personalizado" };

  const cards = [
    { icon: MapPin, label: copy.address, content: <>360 Merchandising<br />Avenida Fernão de Magalhães, N.º 481<br />2.º Andar - Sala D<br />3000-177 Coimbra</> },
    { icon: Phone, label: copy.phone, content: <a href="tel:+351913784204" className="font-semibold hover:text-[#ff6a00]">+351 913 784 204</a> },
    { icon: Mail, label: copy.email, content: <a href="mailto:info@360-merchandising.com" className="font-semibold hover:text-[#ff6a00]">info@360-merchandising.com</a> },
  ];

  return (
    <main className="bg-neutral-50 px-6 py-12 sm:py-16">
      <section className="mx-auto max-w-6xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#ff6a00]">{copy.eyebrow}</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-[#162334] sm:text-5xl">{copy.title}</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-neutral-600">{copy.intro}</p>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {cards.map(({ icon: Icon, label, content }) => (
            <article key={label} className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm">
              <Icon className="h-6 w-6 text-[#ff6a00]" />
              <h2 className="mt-5 text-sm font-semibold uppercase tracking-[0.16em] text-neutral-500">{label}</h2>
              <div className="mt-3 leading-7 text-[#162334]">{content}</div>
            </article>
          ))}
        </div>
        <Link href={localizePath("/contacto", locale)} className="mt-8 inline-flex rounded-full bg-[#162334] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#22344a]">
          {copy.quote}
        </Link>
      </section>
    </main>
  );
}
