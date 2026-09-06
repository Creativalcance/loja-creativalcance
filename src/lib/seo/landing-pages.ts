export type SeoLandingKind = "application" | "industry";

export type SeoLandingConfig = {
  slug: string;
  kind: SeoLandingKind;
  title: string;
  h1: string;
  description: string;
  eyebrow: string;
  intro: string;
  sections: Array<{
    title: string;
    text: string;
  }>;
  highlights: string[];
  productQueries: string[];
  relatedSlugs: string[];
};

const APPLICATIONS: SeoLandingConfig[] = [
  {
    slug: "welcome-kits",
    kind: "application",
    title: "Welcome kits personalizados para empresas",
    h1: "Welcome kits personalizados para empresas e equipas",
    description:
      "Ideias e produtos para criar welcome kits personalizados para onboarding, novos colaboradores, clientes e eventos corporativos.",
    eyebrow: "Aplicações · Welcome kits",
    intro:
      "Um welcome kit bem construído junta utilidade, identidade de marca e uma experiência de boas-vindas coerente. Na 360 Merchandising pode combinar diferentes tipos de artigos e encontrar opções personalizáveis para vários contextos e orçamentos.",
    sections: [
      {
        title: "O que pode incluir um welcome kit?",
        text: "Cadernos, canetas, garrafas, sacos, mochilas, têxteis e acessórios tecnológicos são algumas das categorias que podem ser combinadas. A seleção deve partir de quem vai receber o kit, do contexto de utilização e do orçamento disponível.",
      },
      {
        title: "Welcome kits para onboarding",
        text: "No onboarding, os artigos mais úteis tendem a ser aqueles que acompanham o dia de trabalho e reforçam a identificação com a empresa. A personalização pode ser ajustada à peça, à área disponível e à técnica compatível com cada produto.",
      },
      {
        title: "Como escolher os produtos",
        text: "Defina primeiro o número de pessoas, o objetivo, o teto de investimento por kit e a data em que precisa de receber a encomenda. Depois compare materiais, stock, quantidades mínimas e opções de personalização.",
      },
    ],
    highlights: [
      "Onboarding de novos colaboradores",
      "Kits para clientes e parceiros",
      "Soluções para equipas e eventos internos",
      "Opções clássicas, tecnológicas e sustentáveis",
    ],
    productQueries: ["caderno", "caneta", "garrafa", "mochila", "saco", "powerbank"],
    relatedSlugs: ["colaboradores", "eventos", "congressos"],
  },
  {
    slug: "eventos",
    kind: "application",
    title: "Brindes personalizados para eventos",
    h1: "Brindes e merchandising personalizado para eventos",
    description:
      "Descubra brindes personalizados para eventos empresariais, ativações de marca, lançamentos, feiras e experiências presenciais.",
    eyebrow: "Aplicações · Eventos",
    intro:
      "Em eventos, o merchandising deve ser fácil de distribuir, útil para quem recebe e coerente com a identidade da marca. A escolha certa depende do formato do evento, do número de participantes e do papel que o brinde terá antes, durante ou depois da experiência.",
    sections: [
      {
        title: "Produtos para aumentar a recordação da marca",
        text: "Artigos de utilização recorrente, como garrafas, canetas, sacos, cadernos ou acessórios tecnológicos, podem prolongar a presença da marca muito para além do próprio evento.",
      },
      {
        title: "Merchandising para ativações e lançamentos",
        text: "Quando o objetivo é criar impacto, pode combinar um produto principal com artigos complementares e construir um kit temático. A seleção deve equilibrar visibilidade, utilidade, quantidade e custo unitário.",
      },
      {
        title: "Planeamento antes da encomenda",
        text: "Confirme a quantidade necessária, a técnica de personalização, o ficheiro de arte, o stock disponível e a data do evento antes de fechar a seleção final.",
      },
    ],
    highlights: [
      "Eventos corporativos e ativações",
      "Lançamentos de produto",
      "Feiras e exposições",
      "Eventos internos e ações de marca",
    ],
    productQueries: ["lanyard", "saco", "caneta", "garrafa", "caderno", "t-shirt"],
    relatedSlugs: ["congressos", "welcome-kits", "colaboradores"],
  },
  {
    slug: "congressos",
    kind: "application",
    title: "Brindes e kits personalizados para congressos",
    h1: "Brindes personalizados para congressos e conferências",
    description:
      "Encontre lanyards, sacos, cadernos, canetas, garrafas e outros artigos personalizáveis para congressos e conferências.",
    eyebrow: "Aplicações · Congressos",
    intro:
      "Congressos e conferências combinam necessidades funcionais com uma forte oportunidade de exposição de marca. O kit do participante pode concentrar identificação, materiais de apoio e brindes úteis numa experiência consistente.",
    sections: [
      {
        title: "Kit do participante",
        text: "Lanyards, sacos, blocos, canetas e garrafas são escolhas frequentes porque acompanham o participante ao longo do evento e podem ser usados posteriormente.",
      },
      {
        title: "Patrocinadores e diferentes níveis de visibilidade",
        text: "Quando existem vários patrocinadores, é possível distribuir a presença de marca por diferentes artigos ou selecionar produtos específicos para convidados, oradores e equipas de organização.",
      },
      {
        title: "Quantidade, stock e personalização",
        text: "Congressos exigem planeamento de quantidades e datas. Compare stock, mínimos de encomenda e técnicas de personalização antes de definir a composição final do kit.",
      },
    ],
    highlights: [
      "Kits de congressista",
      "Conferências e seminários",
      "Brindes para oradores e convidados",
      "Materiais para patrocinadores",
    ],
    productQueries: ["lanyard", "caderno", "bloco", "caneta", "saco", "garrafa"],
    relatedSlugs: ["eventos", "welcome-kits", "colaboradores"],
  },
  {
    slug: "natal",
    kind: "application",
    title: "Presentes de Natal personalizados para empresas",
    h1: "Presentes e brindes de Natal personalizados para empresas",
    description:
      "Ideias de presentes de Natal personalizados para colaboradores, clientes, parceiros e equipas empresariais.",
    eyebrow: "Aplicações · Natal",
    intro:
      "Os presentes empresariais de Natal podem servir para agradecer, reconhecer e reforçar relações. A seleção deve considerar o perfil de quem recebe, o posicionamento da marca, o orçamento e a utilidade do artigo.",
    sections: [
      {
        title: "Presentes para colaboradores",
        text: "Produtos de uso diário, artigos para casa, acessórios, têxteis ou conjuntos personalizados permitem criar uma oferta alinhada com diferentes perfis de equipa.",
      },
      {
        title: "Presentes para clientes e parceiros",
        text: "Para relações comerciais, a apresentação, a qualidade percebida e a adequação ao contexto têm um peso especial. A personalização deve reforçar a marca sem comprometer a utilização do produto.",
      },
      {
        title: "Preparar a campanha com antecedência",
        text: "Campanhas de Natal concentram procura e exigem coordenação. Defina destinatários, quantidades, personalização e data de entrega com antecedência suficiente para comparar alternativas.",
      },
    ],
    highlights: [
      "Colaboradores e equipas",
      "Clientes e parceiros",
      "Presentes premium e funcionais",
      "Opções sustentáveis e reutilizáveis",
    ],
    productQueries: ["caneca", "garrafa", "manta", "caderno", "mochila", "conjunto"],
    relatedSlugs: ["colaboradores", "welcome-kits", "eventos"],
  },
  {
    slug: "colaboradores",
    kind: "application",
    title: "Brindes personalizados para colaboradores",
    h1: "Merchandising e brindes personalizados para colaboradores",
    description:
      "Soluções de merchandising para colaboradores, onboarding, reconhecimento, eventos internos e employer branding.",
    eyebrow: "Aplicações · Colaboradores",
    intro:
      "O merchandising interno pode apoiar onboarding, reconhecimento, cultura de empresa e momentos de equipa. A escolha dos artigos deve privilegiar utilidade, adequação ao contexto e coerência com a identidade da organização.",
    sections: [
      {
        title: "Employer branding e cultura de empresa",
        text: "Têxteis, acessórios de trabalho, garrafas, mochilas e outros produtos de utilização regular podem reforçar a sensação de pertença quando são escolhidos com qualidade e intenção.",
      },
      {
        title: "Momentos ao longo da experiência do colaborador",
        text: "Onboarding, aniversários da empresa, eventos internos, reconhecimento e team building são momentos diferentes e podem justificar soluções de merchandising distintas.",
      },
      {
        title: "Personalização adequada ao uso",
        text: "Uma boa personalização considera o material, a dimensão da área, a técnica disponível e a forma como o produto será efetivamente utilizado pela equipa.",
      },
    ],
    highlights: [
      "Onboarding",
      "Employer branding",
      "Reconhecimento e datas especiais",
      "Eventos internos e team building",
    ],
    productQueries: ["polo", "t-shirt", "mochila", "garrafa", "caderno", "caneta"],
    relatedSlugs: ["welcome-kits", "eventos", "natal"],
  },
];

const INDUSTRIES: SeoLandingConfig[] = [
  {
    slug: "hotelaria",
    kind: "industry",
    title: "Merchandising personalizado para hotelaria",
    h1: "Merchandising e brindes personalizados para hotéis",
    description:
      "Soluções de merchandising para hotéis, alojamentos, eventos, hóspedes, equipas e experiências de hospitalidade.",
    eyebrow: "Indústrias · Hotelaria",
    intro:
      "Na hotelaria, o merchandising pode integrar a experiência do hóspede, apoiar eventos, reforçar programas de fidelização e equipar equipas. A seleção deve acompanhar o posicionamento da unidade e a qualidade percebida do serviço.",
    sections: [
      {
        title: "Gifts para hóspedes",
        text: "Sacos, garrafas, cadernos, acessórios e produtos reutilizáveis podem funcionar como recordação da estadia ou complemento de experiências específicas.",
      },
      {
        title: "Eventos e congressos em hotéis",
        text: "Unidades com forte componente de eventos podem recorrer a lanyards, blocos, canetas, sacos e kits para participantes, oradores e equipas de produção.",
      },
      {
        title: "Equipas e identidade da unidade",
        text: "Têxteis e acessórios personalizados também podem apoiar a coerência visual de equipas e operações, respeitando sempre as necessidades funcionais de cada função.",
      },
    ],
    highlights: ["Hóspedes e experiências", "Eventos e congressos", "Equipas", "Gifts e fidelização"],
    productQueries: ["saco", "garrafa", "caderno", "caneta", "polo", "toalha"],
    relatedSlugs: ["restauracao", "turismo"],
  },
  {
    slug: "universidades",
    kind: "industry",
    title: "Merchandising personalizado para universidades",
    h1: "Merchandising e brindes personalizados para universidades",
    description:
      "Merchandising para universidades, escolas, associações académicas, congressos, open days, estudantes e alumni.",
    eyebrow: "Indústrias · Universidades",
    intro:
      "Universidades e instituições de ensino utilizam merchandising em receções a estudantes, congressos, iniciativas académicas, eventos, associações e programas alumni. A variedade de públicos torna importante escolher produtos adequados a cada ocasião.",
    sections: [
      {
        title: "Welcome kits para estudantes",
        text: "Sacos, cadernos, canetas, garrafas e acessórios são facilmente integrados em kits de boas-vindas e ações de integração no início do ano letivo.",
      },
      {
        title: "Congressos e eventos académicos",
        text: "Lanyards, blocos, materiais de escrita e artigos reutilizáveis podem apoiar a organização e dar visibilidade às entidades envolvidas.",
      },
      {
        title: "Comunidade e alumni",
        text: "Têxteis, acessórios e artigos de maior durabilidade podem reforçar a ligação à instituição em iniciativas dirigidas a estudantes, antigos alunos e comunidade académica.",
      },
    ],
    highlights: ["Welcome kits", "Congressos", "Associações académicas", "Alumni e comunidade"],
    productQueries: ["mochila", "saco", "caderno", "caneta", "garrafa", "lanyard"],
    relatedSlugs: ["startups", "tecnologia"],
  },
  {
    slug: "startups",
    kind: "industry",
    title: "Merchandising personalizado para startups",
    h1: "Merchandising e welcome kits para startups",
    description:
      "Brindes, welcome kits e merchandising personalizado para startups, equipas, eventos, recrutamento e comunidades.",
    eyebrow: "Indústrias · Startups",
    intro:
      "Startups tendem a usar merchandising em momentos de crescimento: onboarding, recrutamento, eventos, comunidades, feiras e lançamentos. A flexibilidade e a capacidade de adaptar quantidades e artigos ao momento da empresa são especialmente importantes.",
    sections: [
      {
        title: "Onboarding e cultura",
        text: "Welcome kits com artigos úteis para o dia a dia podem reforçar a identidade da equipa desde a entrada de novos colaboradores.",
      },
      {
        title: "Eventos, comunidades e recrutamento",
        text: "Brindes fáceis de transportar e produtos de uso frequente funcionam bem em meetups, feiras de emprego, conferências e iniciativas de comunidade.",
      },
      {
        title: "Crescer sem perder consistência",
        text: "Uma seleção coerente de produtos permite repetir campanhas e adaptar o merchandising a diferentes públicos sem diluir a identidade visual da marca.",
      },
    ],
    highlights: ["Onboarding", "Recrutamento", "Eventos e meetups", "Comunidades e lançamentos"],
    productQueries: ["t-shirt", "hoodie", "garrafa", "caderno", "mochila", "powerbank"],
    relatedSlugs: ["tecnologia", "universidades"],
  },
  {
    slug: "tecnologia",
    kind: "industry",
    title: "Merchandising personalizado para empresas de tecnologia",
    h1: "Merchandising para empresas de tecnologia e SaaS",
    description:
      "Merchandising, brindes tecnológicos e welcome kits personalizados para empresas de tecnologia, software e SaaS.",
    eyebrow: "Indústrias · Tecnologia",
    intro:
      "Empresas de tecnologia usam merchandising para onboarding, employer branding, eventos, comunidades, conferências e relações com clientes. Produtos funcionais e acessórios tecnológicos podem integrar-se naturalmente nesses contextos.",
    sections: [
      {
        title: "Acessórios tecnológicos",
        text: "Carregadores, cabos, powerbanks, suportes e outros acessórios podem ser combinados com artigos mais tradicionais para criar kits orientados ao trabalho e à mobilidade.",
      },
      {
        title: "Equipas distribuídas",
        text: "Para equipas híbridas ou remotas, artigos de utilização quotidiana ajudam a criar uma experiência de marca comum, mesmo quando os colaboradores trabalham em locais diferentes.",
      },
      {
        title: "Eventos e comunidades",
        text: "Conferências, meetups e iniciativas de comunidade beneficiam de produtos fáceis de distribuir e com utilização posterior ao evento.",
      },
    ],
    highlights: ["SaaS e software", "Equipas híbridas", "Conferências", "Comunidades técnicas"],
    productQueries: ["powerbank", "cabo", "carregador", "mochila", "garrafa", "t-shirt"],
    relatedSlugs: ["startups", "universidades"],
  },
  {
    slug: "saude",
    kind: "industry",
    title: "Brindes personalizados para saúde e clínicas",
    h1: "Brindes e merchandising personalizado para saúde e clínicas",
    description:
      "Soluções de merchandising para clínicas, saúde, congressos, equipas, campanhas de sensibilização e eventos profissionais.",
    eyebrow: "Indústrias · Saúde",
    intro:
      "No setor da saúde, o contexto de utilização e o público devem orientar a seleção do merchandising. Congressos, equipas, campanhas, ações institucionais e eventos profissionais podem exigir artigos muito diferentes entre si.",
    sections: [
      {
        title: "Congressos e eventos profissionais",
        text: "Lanyards, blocos, canetas, sacos e garrafas são artigos versáteis para participantes, equipas e entidades presentes em congressos e conferências.",
      },
      {
        title: "Equipas e comunicação institucional",
        text: "Têxteis, materiais de escrita e acessórios podem apoiar iniciativas internas e ações institucionais, desde que adequados às regras e ao contexto específico da organização.",
      },
      {
        title: "Campanhas e sensibilização",
        text: "Quando o merchandising é usado em campanhas públicas, clareza, utilidade e adequação ao destinatário devem ter prioridade sobre a simples exposição do logótipo.",
      },
    ],
    highlights: ["Congressos", "Clínicas e equipas", "Ações institucionais", "Campanhas"],
    productQueries: ["caneta", "caderno", "lanyard", "saco", "garrafa", "polo"],
    relatedSlugs: ["universidades", "hotelaria"],
  },
  {
    slug: "restauracao",
    kind: "industry",
    title: "Merchandising personalizado para restauração",
    h1: "Merchandising personalizado para restaurantes e restauração",
    description:
      "Merchandising e artigos personalizados para restaurantes, grupos de restauração, equipas, eventos e clientes.",
    eyebrow: "Indústrias · Restauração",
    intro:
      "Restaurantes e grupos de restauração podem usar merchandising na relação com clientes, em eventos, em campanhas de marca e na identificação de equipas. O produto deve ser escolhido de acordo com a experiência que se pretende criar.",
    sections: [
      {
        title: "Experiência do cliente",
        text: "Artigos reutilizáveis e produtos associados ao lifestyle da marca podem prolongar a relação com o cliente para além da visita ao espaço.",
      },
      {
        title: "Equipas e eventos",
        text: "Têxteis, sacos, acessórios e materiais de apoio podem ser usados em equipas, ativações, festivais gastronómicos e eventos especiais.",
      },
      {
        title: "Marca e coerência visual",
        text: "A técnica e a dimensão da personalização devem ser selecionadas em função do material e da utilização real do artigo.",
      },
    ],
    highlights: ["Restaurantes", "Grupos de restauração", "Equipas", "Eventos gastronómicos"],
    productQueries: ["avental", "saco", "garrafa", "caneca", "t-shirt", "copo"],
    relatedSlugs: ["hotelaria", "turismo"],
  },
  {
    slug: "turismo",
    kind: "industry",
    title: "Merchandising personalizado para turismo",
    h1: "Merchandising personalizado para turismo e experiências",
    description:
      "Brindes e merchandising para turismo, experiências, alojamento, operadores, eventos e destinos.",
    eyebrow: "Indústrias · Turismo",
    intro:
      "No turismo, o merchandising pode funcionar como recordação, produto de apoio a uma experiência, gift para hóspedes ou elemento de uma campanha de destino. A escolha deve equilibrar portabilidade, utilidade e identidade local ou de marca.",
    sections: [
      {
        title: "Experiências e recordação",
        text: "Produtos úteis em viagem ou no quotidiano podem prolongar a memória de uma experiência e reforçar a ligação ao destino ou operador.",
      },
      {
        title: "Alojamento e operadores",
        text: "Sacos, garrafas, acessórios e artigos reutilizáveis podem ser integrados em ofertas de boas-vindas, experiências premium ou programas de fidelização.",
      },
      {
        title: "Eventos e promoção de destinos",
        text: "Em feiras e ações promocionais, produtos leves, fáceis de transportar e relevantes para o público ajudam a maximizar a utilidade do investimento.",
      },
    ],
    highlights: ["Destinos", "Operadores", "Alojamento", "Feiras e promoção"],
    productQueries: ["saco", "garrafa", "chapéu", "mochila", "toalha", "caderno"],
    relatedSlugs: ["hotelaria", "restauracao"],
  },
];

export function getApplicationPages(locale: SiteLocale = "pt"): SeoLandingConfig[] {
  return APPLICATIONS.map((page) => localizeLandingConfig(page, locale));
}

export function getIndustryPages(locale: SiteLocale = "pt"): SeoLandingConfig[] {
  return INDUSTRIES.map((page) => localizeLandingConfig(page, locale));
}

export function getApplicationPage(slug: string, locale: SiteLocale = "pt"): SeoLandingConfig | null {
  const page = APPLICATIONS.find((item) => item.slug === slug);
  return page ? localizeLandingConfig(page, locale) : null;
}

export function getIndustryPage(slug: string, locale: SiteLocale = "pt"): SeoLandingConfig | null {
  const page = INDUSTRIES.find((item) => item.slug === slug);
  return page ? localizeLandingConfig(page, locale) : null;
}

export function getLandingPage(kind: SeoLandingKind, slug: string, locale: SiteLocale = "pt"): SeoLandingConfig | null {
  return kind === "application" ? getApplicationPage(slug, locale) : getIndustryPage(slug, locale);
}

export function getRelatedLandingPages(config: SeoLandingConfig, locale: SiteLocale = "pt"): SeoLandingConfig[] {
  const source = config.kind === "application" ? APPLICATIONS : INDUSTRIES;

  return config.relatedSlugs
    .map((slug) => source.find((item) => item.slug === slug))
    .filter((item): item is SeoLandingConfig => Boolean(item))
    .map((item) => localizeLandingConfig(item, locale));
}
import type { SiteLocale } from "@/lib/i18n/config";
import { localizeLandingConfig } from "@/lib/i18n/landing-content";
