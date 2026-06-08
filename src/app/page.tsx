import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Gift,
  Search,
  Shirt,
  Sparkles,
} from "lucide-react";
import SiteHeader from "@/components/layout/SiteHeader";

const categories = [
  {
    title: "Brindes Promocionais",
    description:
      "Produtos personalizados para campanhas, eventos e activações de marca.",
    href: "/categorias",
    icon: Gift,
  },
  {
    title: "Merchandising Corporativo",
    description:
      "Soluções de branding para empresas, equipas e clientes estratégicos.",
    href: "/categorias",
    icon: Building2,
  },
  {
    title: "Vestuário Promocional",
    description: "T-shirts, polos, sweats, casacos e uniformes personalizados.",
    href: "/categorias",
    icon: Shirt,
  },
  {
    title: "Gifts Empresariais",
    description:
      "Presentes corporativos premium para clientes, equipas e parceiros.",
    href: "/categorias",
    icon: Sparkles,
  },
];

export default function HomePage() {
  return (
    <>
      <SiteHeader />

      <main className="min-h-screen bg-neutral-950 text-white">
        <section className="mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-7xl flex-col justify-center px-6 py-20">
          <div className="max-w-4xl">
            <p className="mb-5 inline-flex rounded-full border border-white/15 px-4 py-2 text-sm text-white/70">
              Loja Creativ — plataforma B2B premium para marcas exigentes
            </p>

            <h1 className="text-5xl font-semibold tracking-tight text-white md:text-7xl">
              Brindes promocionais e merchandising corporativo com compra
              directa online.
            </h1>

            <p className="mt-8 max-w-2xl text-lg leading-8 text-white/70">
              A Loja Creativ ajuda empresas a comprar produtos personalizados,
              merchandising, vestuário promocional e gifts empresariais com uma
              experiência digital simples, premium e orientada à venda directa.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/pesquisa"
                className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-white/90"
              >
                Procurar produtos
                <Search className="ml-2 h-4 w-4" />
              </Link>

              <Link
                href="/contacto"
                className="inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Pedido personalizado
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mt-20 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {categories.map((category) => {
              const Icon = category.icon;

              return (
                <Link
                  key={category.title}
                  href={category.href}
                  className="group rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-white/30 hover:bg-white/[0.06]"
                >
                  <Icon className="h-7 w-7 text-white" />

                  <h2 className="mt-8 text-xl font-semibold text-white">
                    {category.title}
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-white/60">
                    {category.description}
                  </p>

                  <span className="mt-6 inline-flex items-center text-sm font-medium text-white">
                    Explorar
                    <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}