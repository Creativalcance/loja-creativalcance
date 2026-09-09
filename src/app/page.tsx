import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Backpack,
  Baby,
  Badge,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Cpu,
  CupSoda,
  Dumbbell,
  Gift,
  House,
  KeyRound,
  LayoutGrid,
  Package,
  Palette,
  PenLine,
  Shirt,
  ShoppingCart,
  Sparkles,
  TreePine,
  Umbrella,
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

type AdditionalCategoryCard = CategoryCard & {
  label: Record<SiteLocale, string>;
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

const additionalCategoryCards: AdditionalCategoryCard[] = [
  {
    imageUrl: "https://cdn.hideacontent.com/public/products/1000x1000/96191_103.jpg",
    href: "/categorias/Agendas",
    icon: CalendarDays,
    layoutClassName: "lg:col-span-5",
    imageSizes: "(min-width: 1024px) 42vw, (min-width: 768px) 50vw, 100vw",
    label: { pt: "Agendas", en: "Diaries & planners", fr: "Agendas" },
  },
  {
    imageUrl: "https://cdn.hideacontent.com/public/products/1000x1000/93873_set.jpg",
    href: "/categorias/Copos%2C%20Garrafas%20e%20Canecas",
    icon: CupSoda,
    layoutClassName: "lg:col-span-7",
    imageSizes: "(min-width: 1024px) 58vw, (min-width: 768px) 50vw, 100vw",
    label: { pt: "Copos, garrafas e canecas", en: "Drinkware", fr: "Verres, bouteilles et mugs" },
  },
  {
    imageUrl: "https://cdn.hideacontent.com/public/products/1000x1000/94945_set.jpg",
    href: "/categorias/Casa",
    icon: House,
    layoutClassName: "lg:col-span-4",
    imageSizes: "(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw",
    label: { pt: "Casa", en: "Home", fr: "Maison" },
  },
  {
    imageUrl: "https://cdn.hideacontent.com/public/products/1000x1000/35869_100.jpg",
    href: "/categorias/Crian%C3%A7a",
    icon: Baby,
    layoutClassName: "lg:col-span-4",
    imageSizes: "(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw",
    label: { pt: "Criança", en: "Kids", fr: "Enfants" },
  },
  {
    imageUrl: "https://cdn.hideacontent.com/public/products/1000x1000/94035_set.jpg",
    href: "/categorias/Desporto%20e%20ar%20livre",
    icon: Dumbbell,
    layoutClassName: "lg:col-span-4",
    imageSizes: "(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw",
    label: { pt: "Desporto e ar livre", en: "Sports & outdoors", fr: "Sports et plein air" },
  },
  {
    imageUrl: "https://cdn.hideacontent.com/public/products/1000x1000/92667a_set.jpg",
    href: "/categorias/Mochilas%2C%20Malas%20e%20Pastas",
    icon: Backpack,
    layoutClassName: "lg:col-span-7",
    imageSizes: "(min-width: 1024px) 58vw, (min-width: 768px) 50vw, 100vw",
    label: { pt: "Mochilas, malas e pastas", en: "Backpacks, bags & briefcases", fr: "Sacs à dos, sacs et porte-documents" },
  },
  {
    imageUrl: "https://cdn.hideacontent.com/public/products/1000x1000/97222_set.jpg",
    href: "/categorias/Tecnologia",
    icon: Cpu,
    layoutClassName: "lg:col-span-5",
    imageSizes: "(min-width: 1024px) 42vw, (min-width: 768px) 50vw, 100vw",
    label: { pt: "Tecnologia", en: "Technology", fr: "Technologie" },
  },
  {
    imageUrl: "https://cdn.hideacontent.com/public/products/1000x1000/11100_108.jpg",
    href: "/categorias/Escrita",
    icon: PenLine,
    layoutClassName: "lg:col-span-4",
    imageSizes: "(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw",
    label: { pt: "Escrita", en: "Writing", fr: "Écriture" },
  },
  {
    imageUrl: "https://cdn.hideacontent.com/public/products/1000x1000/93668_set.jpg",
    href: "/categorias/Kits",
    icon: Package,
    layoutClassName: "lg:col-span-4",
    imageSizes: "(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw",
    label: { pt: "Kits", en: "Kits", fr: "Kits" },
  },
  {
    imageUrl: "https://cdn.hideacontent.com/public/products/1000x1000/95132_set.jpg",
    href: "/categorias/Pessoal%20e%20viagem",
    icon: Badge,
    layoutClassName: "lg:col-span-4",
    imageSizes: "(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw",
    label: { pt: "Pessoal e viagem", en: "Personal & travel", fr: "Personnel et voyage" },
  },
  {
    imageUrl: "https://cdn.hideacontent.com/public/products/1000x1000/99568_105.jpg",
    href: "/categorias/Sol%20e%20chuva",
    icon: Umbrella,
    layoutClassName: "lg:col-span-5",
    imageSizes: "(min-width: 1024px) 42vw, (min-width: 768px) 50vw, 100vw",
    label: { pt: "Sol e chuva", en: "Sun & rain", fr: "Soleil et pluie" },
  },
  {
    imageUrl: "https://cdn.hideacontent.com/public/products/1000x1000/99316_105.jpg",
    href: "/categorias/Xmas",
    icon: TreePine,
    layoutClassName: "lg:col-span-7",
    imageSizes: "(min-width: 1024px) 58vw, (min-width: 768px) 50vw, 100vw",
    label: { pt: "Natal", en: "Christmas", fr: "Noël" },
  },
  {
    imageUrl: "https://cdn.hideacontent.com/public/products/1000x1000/93089_amb.jpg",
    href: "/categorias/Porta-chaves%20e%20lanyards",
    icon: KeyRound,
    layoutClassName: "lg:col-span-4",
    imageSizes: "(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw",
    label: { pt: "Porta-chaves e lanyards", en: "Keyrings & lanyards", fr: "Porte-clés et lanyards" },
  },
  {
    imageUrl: "https://cdn.hideacontent.com/public/products/1000x1000/73129_set.jpg",
    href: "/categorias/Button%20P%27In",
    icon: CircleDot,
    layoutClassName: "lg:col-span-4",
    imageSizes: "(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw",
    label: { pt: "Pins personalizados", en: "Custom pins", fr: "Badges personnalisés" },
  },
  {
    imageUrl: "https://cdn.hideacontent.com/public/products/1000x1000/73390_340-b.jpg",
    href: "/categorias/DOM%27ING",
    icon: CircleDot,
    layoutClassName: "lg:col-span-4",
    imageSizes: "(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw",
    label: { pt: "Doming", en: "Doming", fr: "Doming" },
  },
  {
    imageUrl: "https://cdn.hideacontent.com/public/products/1000x1000/70006_set.jpg",
    href: "/categorias/Mostru%C3%A1rios",
    icon: LayoutGrid,
    layoutClassName: "lg:col-span-12",
    imageSizes: "(min-width: 1024px) 100vw, (min-width: 768px) 50vw, 100vw",
    imagePositionClassName: "object-center",
    label: { pt: "Mostruários", en: "Showcases", fr: "Présentoirs" },
  },
];

const additionalCategoriesCopy: Record<SiteLocale, { eyebrow: string; title: string }> = {
  pt: { eyebrow: "Mais para descobrir", title: "Todas as categorias, para todas as ideias." },
  en: { eyebrow: "More to discover", title: "Every category, for every idea." },
  fr: { eyebrow: "Encore plus à découvrir", title: "Toutes les catégories, pour toutes vos idées." },
};

const buyingStepIcons = [LayoutGrid, Palette, ShoppingCart, CheckCircle2] as const;

export default async function HomePage() {
  const locale = await getCurrentLocale();
  const messages = getMessages(locale).home;
  const additionalCopy = additionalCategoriesCopy[locale];
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

            <div className="mt-16 border-t border-[#162334]/10 pt-12 lg:mt-20 lg:pt-16">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#ff6a00]">
                {additionalCopy.eyebrow}
              </p>
              <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                {additionalCopy.title}
              </h2>

              <div className="mt-9 grid gap-5 md:grid-cols-2 lg:grid-cols-12 lg:gap-6">
                {additionalCategoryCards.map((category) => {
                  const title = category.label[locale];
                  const Icon = category.icon;

                  return (
                    <Link
                      key={category.href}
                      href={localizePath(category.href, locale)}
                      aria-label={[messages.explore, title].join(" ")}
                      className={[
                        "group relative isolate min-h-[20rem] overflow-hidden rounded-[1.75rem] bg-[#162334] shadow-[0_16px_45px_rgba(22,35,52,0.10)] transition duration-500 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(22,35,52,0.20)] md:min-h-[22rem]",
                        category.layoutClassName,
                      ].join(" ")}
                    >
                      <Image
                        src={category.imageUrl}
                        alt=""
                        fill
                        sizes={category.imageSizes}
                        className={[
                          "-z-20 object-cover transition duration-700 ease-out group-hover:scale-[1.045]",
                          category.imagePositionClassName ?? "object-center",
                        ].join(" ")}
                      />
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(16,27,42,0.02)_16%,rgba(16,27,42,0.20)_48%,rgba(16,27,42,0.94)_100%)]"
                      />

                      <span className="absolute left-5 top-5 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/25 bg-[#162334]/75 text-white shadow-lg backdrop-blur-md md:left-6 md:top-6">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>

                      <div className="absolute inset-x-0 bottom-0 p-6 text-white md:p-7">
                        <h3 className="max-w-2xl text-xl font-semibold tracking-[-0.02em] md:text-2xl">
                          {title}
                        </h3>
                        <span className="mt-4 inline-flex items-center text-sm font-semibold text-[#ff8a38]">
                          {messages.seeProducts}
                          <ArrowRight
                            className="ml-2 h-4 w-4 transition group-hover:translate-x-1"
                            aria-hidden="true"
                          />
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
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
