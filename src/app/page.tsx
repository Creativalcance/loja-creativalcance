import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Gift,
  LayoutGrid,
  Palette,
  Shirt,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import SiteFooter from "@/components/layout/SiteFooter";
import SiteHeader from "@/components/layout/SiteHeader";
import NewsletterSignup from "@/components/newsletter/NewsletterSignup";
import SmartMerchSearchForm from "@/components/smart-merch/SmartMerchSearchForm";
import { localizePath, type SiteLocale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import { getCurrentLocale } from "@/lib/i18n/server";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();
  const localizedPath = localizePath("/", locale);
  const metadataByLocale: Record<SiteLocale, { title: string; description: string }> = {
    pt: {
      title: "360 Merchandising | Brindes Personalizados e Merchandising",
      description:
        "Encontre brindes personalizados, merchandising corporativo, gifts empresariais e vestuário promocional com pesquisa inteligente, preços por quantidade e personalização.",
    },
    en: {
      title: "360 Merchandising | Custom Merchandise and Corporate Gifts",
      description:
        "Find custom merchandise, promotional products, corporate gifts and branded clothing with smart search, quantity pricing and customisation.",
    },
    fr: {
      title: "360 Merchandising | Objets personnalisés et cadeaux d’entreprise",
      description:
        "Trouvez des objets personnalisés, du merchandising, des cadeaux d’entreprise et des vêtements promotionnels avec recherche intelligente et tarifs dégressifs.",
    },
  };
  const content = metadataByLocale[locale];

  return {
    title: { absolute: content.title },
    description: content.description,
    alternates: {
      canonical: localizedPath,
      languages: {
        "pt-PT": "/",
        "en-GB": "/en",
        "fr-FR": "/fr",
        "x-default": "/",
      },
    },
  };
}

type CategoryCard = {
  imageUrl: string;
  href: string;
  icon: LucideIcon;
  layoutClassName: string;
  imageSizes: string;
  imagePositionClassName?: string;
};

const categoryCards: CategoryCard[] = [
  {
    imageUrl: "https://cdn.hideacontent.com/public/products/1000x1000/93669_amb.jpg",
    href: "/categorias/Escrit%C3%B3rio",
    icon: Gift,
    layoutClassName: "lg:col-span-7",
    imageSizes: "(min-width: 1280px) 720px, (min-width: 1024px) 58vw, (min-width: 768px) 50vw, 100vw",
    imagePositionClassName: "object-center",
  },
  {
    imageUrl: "https://cdn.hideacontent.com/public/products/1000x1000/93673_amb.jpg",
    href: "/categorias/Escrit%C3%B3rio",
    icon: Building2,
    layoutClassName: "lg:col-span-5",
    imageSizes: "(min-width: 1280px) 520px, (min-width: 1024px) 42vw, (min-width: 768px) 50vw, 100vw",
    imagePositionClassName: "object-center",
  },
  {
    imageUrl: "https://cdn.hideacontent.com/public/products/1000x1000/30139_amb.jpg",
    href: "/categorias/T%C3%AAxtil",
    icon: Shirt,
    layoutClassName: "lg:col-span-5",
    imageSizes: "(min-width: 1280px) 520px, (min-width: 1024px) 42vw, (min-width: 768px) 50vw, 100vw",
    imagePositionClassName: "object-center",
  },
  {
    imageUrl: "https://cdn.hideacontent.com/public/products/1000x1000/92824_amb.jpg",
    href: "/categorias/Compras",
    icon: Sparkles,
    layoutClassName: "lg:col-span-7",
    imageSizes: "(min-width: 1280px) 720px, (min-width: 1024px) 58vw, (min-width: 768px) 50vw, 100vw",
    imagePositionClassName: "object-center",
  },
];

const buyingStepIcons = [LayoutGrid, Palette, ShoppingCart, CheckCircle2] as const;

export default async function HomePage() {
  const locale = await getCurrentLocale();
  const messages = getMessages(locale).home;
  const steps = messages.steps.map(([title, description], index) => ({
    title,
    description,
    icon: buyingStepIcons[index] ?? LayoutGrid,
  }));

  return (
    <>
      <SiteHeader />

      <main className="min-h-screen overflow-hidden bg-[#101b2a] text-white">
        <section className="relative isolate border-b border-white/10">
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_82%_12%,rgba(255,106,0,0.20),transparent_28%),radial-gradient(circle_at_16%_78%,rgba(255,255,255,0.08),transparent_30%)]"
          />

          <div className="mx-auto grid w-full max-w-7xl gap-12 px-6 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:py-20">
            <div className="max-w-2xl">
              <p className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-sm text-white/75 backdrop-blur">
                <Sparkles className="mr-2 h-4 w-4 text-[#ff7a1a]" aria-hidden="true" />
                360 Smart Merch — {messages.badge}
              </p>

              <h1 className="mt-7 text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
                {messages.title}
              </h1>

              <p className="mt-6 max-w-xl text-base leading-7 text-white/65 sm:text-lg sm:leading-8">
                {messages.intro}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={localizePath("/categorias", locale)}
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#ff6a00] px-6 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#e85f00]"
                >
                  {messages.seeCategories}
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>

                <Link
                  href="#como-comprar"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 px-6 text-sm font-semibold text-white transition hover:border-white/45 hover:bg-white/[0.07]"
                >
                  {messages.howToBuy}
                </Link>
              </div>
            </div>

            <div className="relative">
              <div aria-hidden="true" className="absolute -inset-6 -z-10 rounded-[3rem] bg-[#ff6a00]/10 blur-3xl" />
              <SmartMerchSearchForm locale={locale} />
            </div>
          </div>

          <div className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-px border-x border-t border-white/10 bg-white/10 sm:grid-cols-3 lg:grid-cols-6">
            {messages.benefits.map((benefit) => (
              <div key={benefit} className="flex min-h-20 items-center gap-3 bg-[#101b2a] px-4 py-4">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#ff7a1a]" aria-hidden="true" />
                <span className="text-xs font-medium leading-5 text-white/65">{benefit}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="categorias" className="bg-[#f5f7f9] text-[#162334]">
          <div className="mx-auto w-full max-w-7xl px-6 py-16 lg:py-20">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#ff6a00]">
                  {messages.categories}
                </p>
                <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.03em] sm:text-4xl lg:text-5xl">
                  {messages.categoryTitle}
                </h2>
                <p className="mt-4 max-w-2xl leading-7 text-[#162334]/60">
                  {messages.categoryIntro}
                </p>
              </div>

              <Link
                href={localizePath("/categorias", locale)}
                className="inline-flex shrink-0 items-center text-sm font-semibold text-[#162334]"
              >
                {messages.allCategories}
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-12 lg:gap-6">
              {categoryCards.map((category, index) => {
                const [title, description] = messages.categoryCards[index];
                const Icon = category.icon;

                return (
                  <Link
                    key={category.href + index}
                    href={localizePath(category.href, locale)}
                    aria-label={`${messages.explore} ${title}`}
                    className={`group relative isolate min-h-[27rem] overflow-hidden rounded-[2rem] bg-[#162334] shadow-[0_18px_50px_rgba(22,35,52,0.12)] transition duration-500 hover:-translate-y-1 hover:shadow-[0_28px_70px_rgba(22,35,52,0.22)] md:min-h-[30rem] ${category.layoutClassName}`}
                  >
                    <Image
                      src={category.imageUrl}
                      alt=""
                      fill
                      priority={index === 0}
                      sizes={category.imageSizes}
                      className={`-z-20 object-cover transition duration-700 ease-out group-hover:scale-[1.045] ${category.imagePositionClassName ?? "object-center"}`}
                    />
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(16,27,42,0.04)_20%,rgba(16,27,42,0.38)_58%,rgba(16,27,42,0.96)_100%)] transition duration-500 group-hover:bg-[linear-gradient(180deg,rgba(16,27,42,0.02)_15%,rgba(16,27,42,0.32)_54%,rgba(16,27,42,0.97)_100%)]"
                    />

                    <span className="absolute left-6 top-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/25 bg-[#162334]/75 text-white shadow-lg backdrop-blur-md md:left-7 md:top-7">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>

                    <div className="absolute inset-x-0 bottom-0 p-6 text-white md:p-8">
                      <h3 className="max-w-xl text-2xl font-semibold tracking-[-0.025em] md:text-3xl">
                        {title}
                      </h3>
                      <p className="mt-3 max-w-xl text-sm leading-6 text-white/75 md:text-base md:leading-7">
                        {description}
                      </p>
                      <span className="mt-5 inline-flex items-center rounded-full bg-[#ff6a00] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(255,106,0,0.28)] transition duration-300 group-hover:bg-[#ff7a1a]">
                        {messages.seeProducts}
                        <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section id="como-comprar" className="border-y border-white/10 bg-white/[0.025]">
          <div className="mx-auto w-full max-w-7xl px-6 py-16 lg:py-20">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#ff7a1a]">
              {messages.howToBuy}
            </p>
            <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl lg:text-5xl">
              {messages.howTitle}
            </h2>

            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {steps.map((step, index) => {
                const Icon = step.icon;

                return (
                  <div key={step.title} className="relative rounded-3xl border border-white/10 bg-white/[0.045] p-6">
                    <div className="flex items-center justify-between">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#162334]">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span className="text-sm font-semibold text-white/25">0{index + 1}</span>
                    </div>
                    <h3 className="mt-6 text-lg font-semibold text-white">{step.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-white/55">{step.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-6 py-16 lg:py-20">
          <div className="grid overflow-hidden rounded-[2rem] bg-white text-[#162334] lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="p-8 sm:p-10 lg:p-12">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#ff6a00]">
                {messages.b2b}
              </p>
              <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                {messages.b2bTitle}
              </h2>
              <p className="mt-5 max-w-3xl leading-7 text-[#162334]/60">{messages.b2bIntro}</p>
            </div>

            <div className="flex h-full items-center bg-[#ff6a00] p-8 sm:p-10 lg:max-w-sm lg:p-12">
              <Link
                href={localizePath("/categorias", locale)}
                className="inline-flex min-h-14 w-full items-center justify-center rounded-full bg-[#162334] px-7 text-sm font-semibold text-white transition hover:bg-[#24364d]"
              >
                {messages.exploreCatalog}
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <NewsletterSignup locale={locale} />
      <SiteFooter />
    </>
  );
}
