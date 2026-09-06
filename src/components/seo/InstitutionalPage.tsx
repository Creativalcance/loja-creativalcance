import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import type { InstitutionalPageConfig } from "@/lib/seo/institutional-pages";
import { localizePath, type SiteLocale } from "@/lib/i18n/config";

export default function InstitutionalPage({
  config,
  locale,
}: {
  config: InstitutionalPageConfig;
  locale: SiteLocale;
}) {
  const text = locale === "en"
    ? { back: "Back to homepage", essentials: "Key points", related: "Related information", learn: "Learn more", continue: "Continue" }
    : locale === "fr"
      ? { back: "Retour à l’accueil", essentials: "Points essentiels", related: "Informations connexes", learn: "En savoir plus", continue: "Continuer" }
      : { back: "Voltar à página inicial", essentials: "Pontos essenciais", related: "Informação relacionada", learn: "Saber mais", continue: "Continuar" };
  return (
    <main className="min-h-screen bg-neutral-50">
      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
          <Link
            href={localizePath("/", locale)}
            className="text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
          >
            ← {text.back}
          </Link>

          <div className="mt-10 grid gap-10 lg:grid-cols-[1.3fr_0.7fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#e85f00]">
                {config.eyebrow}
              </p>
              <h1 className="mt-4 max-w-5xl text-4xl font-semibold tracking-tight text-neutral-950 md:text-6xl">
                {config.h1}
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-neutral-600">
                {config.intro}
              </p>
            </div>

            <aside className="rounded-3xl border border-neutral-200 bg-neutral-50 p-6 shadow-sm">
              <ShieldCheck className="h-6 w-6 text-[#e85f00]" />
              <h2 className="mt-4 text-lg font-semibold text-neutral-950">
                {text.essentials}
              </h2>
              <ul className="mt-4 space-y-3">
                {config.highlights.map((item) => (
                  <li
                    key={item}
                    className="flex gap-3 text-sm leading-6 text-neutral-600"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        <div className="mx-auto max-w-4xl space-y-12">
          {config.sections.map((section) => (
            <article key={section.title}>
              <h2 className="text-2xl font-semibold tracking-tight text-neutral-950 md:text-3xl">
                {section.title}
              </h2>
              <p className="mt-4 text-base leading-8 text-neutral-600">
                {section.text}
              </p>
              {section.points?.length ? (
                <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                  {section.points.map((point) => (
                    <li
                      key={point}
                      className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-700"
                    >
                      {point}
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">
            {text.related}
          </p>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {config.related.map((item) => (
              <Link
                key={item.href}
                href={localizePath(item.href, locale)}
                className="group rounded-3xl border border-neutral-200 bg-neutral-50 p-6 transition hover:-translate-y-1 hover:bg-white hover:shadow-lg"
              >
                <h2 className="text-xl font-semibold tracking-tight text-neutral-950">
                  {item.label}
                </h2>
                <p className="mt-3 text-sm leading-6 text-neutral-600">
                  {item.description}
                </p>
                <span className="mt-5 inline-flex items-center text-sm font-semibold text-neutral-950">
                  {text.learn}
                  <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {config.primaryCta ? (
        <section className="mx-auto max-w-7xl px-6 py-12 md:py-16">
          <div className="rounded-3xl bg-neutral-950 p-8 text-white md:flex md:items-center md:justify-between md:gap-8">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                {config.primaryCta.label}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
                {config.primaryCta.description}
              </p>
            </div>
            <Link
              href={localizePath(config.primaryCta.href, locale)}
              className="mt-5 inline-flex shrink-0 items-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-100 md:mt-0"
            >
              {text.continue}
              <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </section>
      ) : null}
    </main>
  );
}
