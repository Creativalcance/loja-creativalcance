import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Mail, Sparkles } from "lucide-react";
import { localizePath, type SiteLocale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import { getCurrentLocale } from "@/lib/i18n/server";

function getFooterGroups(locale: SiteLocale) {
  const messages = getMessages(locale).footer;

  return [
  {
    title: messages.discover,
    links: [
      { label: "360 Smart Merch", href: "/smart-merch" },
      { label: messages.links.categories, href: "/categorias" },
      { label: messages.links.solutions, href: "/solucoes" },
      { label: messages.links.applications, href: "/aplicacoes" },
      { label: messages.links.industries, href: "/industrias" },
      { label: messages.links.guides, href: "/guias" },
      { label: messages.links.selections, href: "/selecoes" },
      { label: messages.links.customization, href: "/personalizacao" },
      { label: messages.links.sustainability, href: "/sustentabilidade" },
      { label: messages.links.blog, href: "/blog" },
      { label: messages.links.search, href: "/pesquisa" },
    ],
  },
  {
    title: messages.support,
    links: [
      { label: messages.links.about, href: "/sobre" },
      { label: messages.links.how, href: "/como-funciona" },
      { label: messages.links.quality, href: "/qualidade" },
      { label: messages.links.delivery, href: "/entregas-e-prazos" },
      { label: messages.links.methodology, href: "/metodologia-editorial" },
      { label: messages.links.buy, href: "/ajuda" },
      { label: messages.links.request, href: "/contacto" },
      { label: messages.links.account, href: "/area-cliente" },
      { label: messages.links.cart, href: "/carrinho" },
    ],
  },
  ].map((group) => ({
    ...group,
    links: group.links.map((link) => ({
      ...link,
      href: localizePath(link.href, locale),
    })),
  }));
}

export default async function SiteFooter() {
  const locale = await getCurrentLocale();
  const messages = getMessages(locale).footer;
  const footerGroups = getFooterGroups(locale);

  return (
    <footer className="border-t border-white/10 bg-[#101a28] text-white">
      <div className="mx-auto grid w-full max-w-7xl gap-12 px-6 py-14 lg:grid-cols-[1.4fr_1fr_1fr] lg:py-16">
        <div className="max-w-md">
          <Link href={localizePath("/", locale)} aria-label={`360 Merchandising — ${getMessages(locale).header.home}`}>
            <Image
              src="/brand/360-merchandising.png"
              alt="360 Merchandising"
              width={2000}
              height={452}
              className="brand-logo h-auto w-64 brightness-0 invert"
            />
          </Link>

          <p className="mt-6 text-base leading-7 text-white/65">
            {messages.intro}
          </p>

          <Link
            href={localizePath("/smart-merch", locale)}
            className="brand-accent mt-7 inline-flex items-center gap-2 rounded-full border border-[#ff6a00]/40 bg-[#ff6a00]/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-[#ff6a00] hover:bg-[#ff6a00]/15"
          >
            <Sparkles className="h-4 w-4" />
            {messages.trySmart}
          </Link>
        </div>

        {footerGroups.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/40">
              {group.title}
            </p>
            <ul className="mt-5 space-y-3">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/70 transition hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-6 py-6 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} 360 Merchandising. {messages.rights}</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href={localizePath("/contacto", locale)} className="inline-flex items-center gap-1.5 hover:text-white">
              <Mail className="h-3.5 w-3.5" /> {messages.commercialSupport}
            </Link>
            <a
              href="https://www.livroreclamacoes.pt/Inicio/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-white"
            >
              {messages.complaints} <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
            <a
              href="https://www.creativalcance.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-white"
            >
              Made by CreativAlcance <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
