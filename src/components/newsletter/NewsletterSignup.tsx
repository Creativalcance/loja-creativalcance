"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight, Mail } from "lucide-react";
import { subscribeNewsletterAction, type NewsletterActionState } from "@/lib/newsletter/actions";
import { localizePath, type SiteLocale } from "@/lib/i18n/config";

const initialState: NewsletterActionState = { success: false, message: "" };

export default function NewsletterSignup({ locale }: { locale: SiteLocale }) {
  const [state, action, pending] = useActionState(subscribeNewsletterAction, initialState);
  const copy = locale === "en"
    ? { eyebrow: "360 updates", title: "Ideas, products and opportunities for your brand", intro: "Receive selected launches, inspiration and useful merchandising content. No noise.", name: "Name", email: "Email address", button: "Subscribe", pending: "Subscribing...", consent: "I agree to receive the 360 Merchandising newsletter and have read the", privacy: "Privacy Policy" }
    : locale === "fr"
      ? { eyebrow: "Actualités 360", title: "Des idées, produits et opportunités pour votre marque", intro: "Recevez une sélection de nouveautés, d’inspiration et de contenus utiles sur le merchandising.", name: "Nom", email: "Adresse e-mail", button: "S’abonner", pending: "Inscription...", consent: "J’accepte de recevoir la newsletter 360 Merchandising et j’ai lu la", privacy: "Politique de Confidentialité" }
      : { eyebrow: "Novidades 360", title: "Ideias, produtos e oportunidades para a sua marca", intro: "Receba uma seleção de novidades, inspiração e conteúdos úteis sobre merchandising. Sem ruído.", name: "Nome", email: "Endereço de email", button: "Subscrever", pending: "A subscrever...", consent: "Aceito receber a newsletter da 360 Merchandising e li a", privacy: "Política de Privacidade" };

  return (
    <section className="bg-neutral-50 px-6 py-10">
      <div className="mx-auto grid max-w-7xl gap-8 rounded-3xl bg-[#162334] px-6 py-8 text-white shadow-xl sm:px-10 sm:py-10 lg:grid-cols-[1fr_1.15fr] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#ff8a38]">{copy.eyebrow}</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{copy.title}</h2>
          <p className="mt-3 max-w-xl leading-7 text-white/65">{copy.intro}</p>
        </div>
        <form action={action} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="locale" value={locale} />
          <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
          <label className="sr-only" htmlFor="newsletter-name">{copy.name}</label>
          <input id="newsletter-name" name="name" required maxLength={120} placeholder={copy.name} className="h-12 rounded-xl border border-white/15 bg-white px-4 text-[#162334] outline-none ring-[#ff6a00] focus:ring-2" />
          <label className="sr-only" htmlFor="newsletter-email">{copy.email}</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-neutral-400" />
            <input id="newsletter-email" name="email" type="email" required maxLength={254} placeholder={copy.email} className="h-12 w-full rounded-xl border border-white/15 bg-white pl-12 pr-4 text-[#162334] outline-none ring-[#ff6a00] focus:ring-2" />
          </div>
          <label className="flex items-start gap-2 text-xs leading-5 text-white/65 sm:col-span-2">
            <input name="consent" type="checkbox" required className="mt-1 accent-[#ff6a00]" />
            <span>{copy.consent} <Link href={localizePath("/politica-de-privacidade", locale)} className="underline hover:text-white">{copy.privacy}</Link>.</span>
          </label>
          <button disabled={pending} className="inline-flex h-12 items-center justify-center rounded-xl bg-[#ff6a00] px-5 font-semibold text-white transition hover:bg-[#e85f00] disabled:opacity-60 sm:col-span-2 sm:justify-self-end">
            {pending ? copy.pending : copy.button}<ArrowRight className="ml-2 h-4 w-4" />
          </button>
          {state.message ? <p role="status" className={`text-sm sm:col-span-2 ${state.success ? "text-emerald-300" : "text-red-300"}`}>{state.message}</p> : null}
        </form>
      </div>
    </section>
  );
}
