import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Mail, Sparkles } from "lucide-react";

const footerGroups = [
  {
    title: "Descobrir",
    links: [
      { label: "360 Smart Merch", href: "/smart-merch" },
      { label: "Categorias", href: "/categorias" },
      { label: "Pesquisar produtos", href: "/pesquisa" },
      { label: "Guias B2B", href: "/blog" },
    ],
  },
  {
    title: "Apoio",
    links: [
      { label: "Como comprar", href: "/ajuda" },
      { label: "Pedido personalizado", href: "/contacto" },
      { label: "Área de cliente", href: "/area-cliente" },
      { label: "Carrinho", href: "/carrinho" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#101a28] text-white">
      <div className="mx-auto grid w-full max-w-7xl gap-12 px-6 py-14 lg:grid-cols-[1.4fr_1fr_1fr] lg:py-16">
        <div className="max-w-md">
          <Link href="/" aria-label="360 Merchandising — página inicial">
            <Image
              src="/brand/360-merchandising.png"
              alt="360 Merchandising"
              width={2000}
              height={452}
              className="brand-logo h-auto w-64 brightness-0 invert"
            />
          </Link>

          <p className="mt-6 text-base leading-7 text-white/65">
            A forma inteligente de encontrar, personalizar e comprar
            merchandising para a sua empresa.
          </p>

          <Link
            href="/smart-merch"
            className="brand-accent mt-7 inline-flex items-center gap-2 rounded-full border border-[#ff6a00]/40 bg-[#ff6a00]/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-[#ff6a00] hover:bg-[#ff6a00]/15"
          >
            <Sparkles className="h-4 w-4" />
            Experimentar o Smart Merch
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
          <p>© {new Date().getFullYear()} 360 Merchandising. Todos os direitos reservados.</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/contacto" className="inline-flex items-center gap-1.5 hover:text-white">
              <Mail className="h-3.5 w-3.5" /> Apoio comercial
            </Link>
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
