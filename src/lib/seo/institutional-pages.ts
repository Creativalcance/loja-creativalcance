export type InstitutionalSection = {
  title: string;
  text: string;
  points?: string[];
};

export type InstitutionalLink = {
  label: string;
  href: string;
  description: string;
};

export type InstitutionalPageConfig = {
  slug: string;
  title: string;
  h1: string;
  description: string;
  eyebrow: string;
  intro: string;
  highlights: string[];
  sections: InstitutionalSection[];
  related: InstitutionalLink[];
  primaryCta?: InstitutionalLink;
};

const PAGES: InstitutionalPageConfig[] = [
  {
    slug: "sobre",
    title: "Sobre a 360 Merchandising",
    h1: "Uma plataforma para encontrar e comprar merchandising com mais contexto",
    description:
      "Conheça a 360 Merchandising, a abordagem da plataforma ao catálogo, personalização, pesquisa inteligente e compra online de brindes e merchandising.",
    eyebrow: "Sobre a 360 Merchandising",
    intro:
      "A 360 Merchandising é uma plataforma de e-commerce dedicada a brindes personalizados, merchandising corporativo e gifts. O objetivo é tornar mais simples a passagem entre uma necessidade concreta — orçamento, quantidade, prazo, público ou ocasião — e uma seleção de produtos que possa ser comparada e encomendada online.",
    highlights: [
      "Pesquisa por produto, categoria e necessidade",
      "Catálogo com variantes, stock e personalização",
      "Compra online e pedidos personalizados",
      "Conteúdo de apoio para decisões mais informadas",
    ],
    sections: [
      {
        title: "Da pesquisa genérica à necessidade concreta",
        text: "Nem todas as compras de merchandising começam com o nome de um produto. Muitas começam com perguntas como 'o que oferecer num congresso?', 'o que incluir num welcome kit?' ou 'que opções cabem neste orçamento?'. A arquitetura da 360 procura responder a essas duas formas de compra: catálogo e necessidade.",
      },
      {
        title: "Catálogo e contexto no mesmo percurso",
        text: "As páginas de produto reúnem informação comercial, variantes, disponibilidade e opções de personalização. Em paralelo, aplicações, indústrias, guias e páginas técnicas ajudam a perceber onde cada solução pode fazer sentido antes de avançar para a configuração concreta.",
      },
      {
        title: "Uma experiência pensada para B2B e B2C",
        text: "A plataforma permite compra direta e também pedidos personalizados para necessidades que exigem apoio adicional, como quantidades elevadas, campanhas específicas ou configurações menos standard.",
      },
      {
        title: "Transparência antes da decisão",
        text: "Preços, stock, variantes e opções técnicas podem mudar ao longo do tempo. A 360 procura apresentar a informação disponível no momento da consulta e separar claramente conteúdo editorial de dados específicos de cada referência.",
      },
    ],
    related: [
      {
        label: "Como funciona",
        href: "/como-funciona",
        description: "Veja o percurso desde a pesquisa até à encomenda.",
      },
      {
        label: "Qualidade e transparência",
        href: "/qualidade",
        description: "Perceba como tratamos informação de produto e personalização.",
      },
      {
        label: "Metodologia editorial",
        href: "/metodologia-editorial",
        description: "Conheça os princípios usados nos guias e conteúdos da 360.",
      },
    ],
    primaryCta: {
      label: "Explorar categorias",
      href: "/categorias",
      description: "Começar pelo catálogo de produtos.",
    },
  },
  {
    slug: "como-funciona",
    title: "Como funciona a 360 Merchandising",
    h1: "Da necessidade à encomenda, passo a passo",
    description:
      "Saiba como pesquisar, escolher, personalizar e comprar brindes e merchandising na 360 Merchandising.",
    eyebrow: "Como funciona",
    intro:
      "A 360 foi desenhada para permitir dois percursos complementares: começar diretamente pelo catálogo ou começar por uma necessidade. Em ambos os casos, a seleção termina na página do produto, onde se confirmam as condições concretas antes da compra.",
    highlights: [
      "1. Definir a necessidade",
      "2. Comparar produtos",
      "3. Configurar quantidade e personalização",
      "4. Rever e concluir a compra",
    ],
    sections: [
      {
        title: "1. Comece pelo produto ou pela necessidade",
        text: "Pode navegar por categorias, usar a pesquisa ou recorrer ao 360 Smart Merch para descrever o que procura através de critérios como contexto, quantidade, orçamento ou prazo.",
      },
      {
        title: "2. Compare a referência e as variantes",
        text: "Na página do produto pode consultar a informação disponível para a referência, incluindo variantes, imagens, características, preço e disponibilidade aplicáveis à seleção apresentada.",
      },
      {
        title: "3. Confirme a personalização",
        text: "Quando o produto permite personalização, as opções dependem da combinação concreta entre variante, componente, localização, técnica, área e quantidade. A configuração apresentada na página do produto é a referência para a compra.",
      },
      {
        title: "4. Reveja os valores antes de adicionar ao carrinho",
        text: "O percurso de compra apresenta o valor do produto e os elementos associados à configuração selecionada. Antes do checkout, reveja quantidades, opções e total do carrinho.",
      },
      {
        title: "5. Conclua o checkout",
        text: "No checkout são recolhidos os dados necessários para faturação e entrega e são apresentadas as opções disponíveis para concluir a encomenda.",
      },
      {
        title: "6. Acompanhe a encomenda",
        text: "Clientes autenticados podem utilizar a área de cliente para consultar os dados associados às suas encomendas e manter a informação da conta atualizada.",
      },
    ],
    related: [
      {
        label: "360 Smart Merch",
        href: "/smart-merch",
        description: "Comece por descrever a necessidade em linguagem natural.",
      },
      {
        label: "Centro de personalização",
        href: "/personalizacao",
        description: "Perceba como funcionam técnicas, áreas e localizações.",
      },
      {
        label: "Entregas e prazos",
        href: "/entregas-e-prazos",
        description: "Veja os fatores que influenciam disponibilidade e prazo.",
      },
    ],
    primaryCta: {
      label: "Começar no Smart Merch",
      href: "/smart-merch",
      description: "Pesquisar a partir da necessidade.",
    },
  },
  {
    slug: "qualidade",
    title: "Qualidade e transparência",
    h1: "Informação clara antes de escolher, personalizar e comprar",
    description:
      "Conheça os princípios da 360 Merchandising para apresentar informação de catálogo, personalização, preço, stock e conteúdo editorial com transparência.",
    eyebrow: "Qualidade e transparência",
    intro:
      "Num catálogo com muitas referências e configurações, qualidade de informação é tão importante como variedade. A 360 procura mostrar o que está disponível para cada produto sem transformar dados de catálogo em promessas que não estejam suportadas pela referência concreta.",
    highlights: [
      "Dados específicos por referência",
      "Personalização dependente da configuração",
      "Stock e preço sujeitos a atualização",
      "Conteúdo editorial separado de dados comerciais",
    ],
    sections: [
      {
        title: "Informação de produto",
        text: "Nome, materiais, dimensões, cores, variantes e outras características são apresentados com base nos dados disponíveis para cada referência. Quando um campo não existe, não deve ser inferido como se fosse uma característica confirmada.",
      },
      {
        title: "Personalização específica por produto",
        text: "Uma técnica não está automaticamente disponível em todas as variantes ou zonas. A configuração depende dos dados associados à referência, componente, localização, área, técnica e quantidade selecionada.",
      },
      {
        title: "Preço e disponibilidade",
        text: "Preços e stocks podem ser atualizados. A informação mostrada no momento da consulta deve ser confirmada no percurso de compra, especialmente quando existe personalização ou uma quantidade específica.",
      },
      {
        title: "Imagens e representação visual",
        text: "As imagens ajudam a identificar produto, cor, componentes e áreas de personalização, mas a configuração comercial deve ser validada pelos dados apresentados para a referência escolhida.",
      },
      {
        title: "Conteúdo editorial responsável",
        text: "Guias, comparativos e páginas de contexto ajudam a tomar decisões, mas não substituem a ficha do produto. Sempre que um conteúdo editorial fala de uma característica concreta, essa característica deve ser confirmada na referência antes da compra.",
      },
    ],
    related: [
      {
        label: "Metodologia editorial",
        href: "/metodologia-editorial",
        description: "Veja como distinguimos orientação, dados e afirmações verificáveis.",
      },
      {
        label: "Sustentabilidade",
        href: "/sustentabilidade",
        description: "Consulte os critérios usados para comunicar materiais e indicadores ambientais.",
      },
      {
        label: "Personalização",
        href: "/personalizacao",
        description: "Entenda a relação entre técnica e configuração do produto.",
      },
    ],
    primaryCta: {
      label: "Consultar guias",
      href: "/guias",
      description: "Aprofundar critérios de escolha.",
    },
  },
  {
    slug: "entregas-e-prazos",
    title: "Entregas, stock e prazos",
    h1: "O prazo depende da referência, da personalização e da entrega",
    description:
      "Saiba que fatores influenciam stock, produção, personalização e entrega de merchandising na 360 Merchandising.",
    eyebrow: "Entregas e prazos",
    intro:
      "Não existe um único prazo aplicável a todo o catálogo. A disponibilidade depende da referência e da variante; quando existe personalização, o processo pode incluir preparação, ficheiros, validação, produção e expedição.",
    highlights: [
      "Stock é específico da referência e variante",
      "Personalização pode acrescentar tempo de produção",
      "A expedição é uma etapa separada",
      "Confirme sempre a configuração final antes da compra",
    ],
    sections: [
      {
        title: "Stock disponível",
        text: "A disponibilidade apresentada resulta dos dados sincronizados para as referências do catálogo. Uma mesma família de produto pode ter comportamentos diferentes entre cores, tamanhos ou outras variantes.",
      },
      {
        title: "Produção e personalização",
        text: "Quando existe personalização, o prazo pode depender da técnica, área, quantidade e preparação necessária para o trabalho. Produtos sem personalização e produtos personalizados não devem ser tratados como se tivessem o mesmo fluxo.",
      },
      {
        title: "Ficheiros e validação",
        text: "Algumas configurações podem depender do ficheiro enviado e de etapas de validação associadas ao trabalho gráfico. Quanto mais cedo os elementos necessários estiverem corretos, menor o risco de atrasos evitáveis.",
      },
      {
        title: "Expedição e entrega",
        text: "Depois da disponibilidade e produção, existe ainda a etapa de expedição. As opções e custos aplicáveis são apresentados no percurso de checkout quando disponíveis para a encomenda em causa.",
      },
      {
        title: "Compras com data crítica",
        text: "Para eventos, congressos, feiras ou datas fixas, não escolha apenas pelo produto. Considere uma margem entre a data de entrega pretendida e a data do evento e valide o prazo antes de assumir a solução como fechada.",
      },
    ],
    related: [
      {
        label: "Como funciona",
        href: "/como-funciona",
        description: "Veja o percurso completo de compra.",
      },
      {
        label: "Brindes para eventos",
        href: "/guias/brindes-para-eventos-guia",
        description: "Planeie seleção, quantidades e prazo para eventos.",
      },
      {
        label: "Pedido personalizado",
        href: "/contacto",
        description: "Peça apoio quando existe uma necessidade ou data específica.",
      },
    ],
    primaryCta: {
      label: "Fazer pedido personalizado",
      href: "/contacto",
      description: "Partilhar quantidade, personalização e data pretendida.",
    },
  },
  {
    slug: "metodologia-editorial",
    title: "Metodologia editorial da 360 Merchandising",
    h1: "Como criamos e revemos os conteúdos da 360",
    description:
      "Conheça a metodologia editorial da 360 Merchandising para guias, comparativos, páginas de personalização, sustentabilidade e conteúdos de apoio à compra.",
    eyebrow: "Metodologia editorial",
    intro:
      "Os conteúdos da 360 existem para ajudar a transformar uma necessidade comercial em critérios de decisão. A metodologia procura distinguir claramente informação de catálogo, orientação editorial, dados externos e afirmações que exigem validação específica.",
    highlights: [
      "Separar factos de orientação editorial",
      "Não inventar reviews, estatísticas ou certificações",
      "Ligar recomendações à configuração concreta",
      "Atualizar conteúdos quando a informação muda",
    ],
    sections: [
      {
        title: "1. Partimos da intenção do utilizador",
        text: "Os guias são estruturados em torno de perguntas reais de compra: objetivo, público, quantidade, orçamento, prazo, material, personalização e contexto de utilização. A seleção editorial procura responder a essas perguntas antes de sugerir produtos.",
      },
      {
        title: "2. Dados de catálogo não são extrapolados",
        text: "Características específicas de produto devem resultar da informação disponível para a referência. Não assumimos que uma certificação, material, técnica ou indicador presente numa referência se aplica automaticamente a outra.",
      },
      {
        title: "3. Recomendações são apresentadas como critérios",
        text: "Quando um guia recomenda uma abordagem, o objetivo é explicar os critérios e trade-offs. A decisão final deve considerar preço, stock, quantidade, técnica e contexto concreto da encomenda.",
      },
      {
        title: "4. Estatísticas e estudos precisam de origem identificável",
        text: "A 360 não deve publicar percentagens, rankings ou tendências como factos sem uma base identificável. Quando forem usados dados próprios, devem ser agregados e explicados; quando forem usados dados externos, a origem deve ser indicada no conteúdo.",
      },
      {
        title: "5. Reviews e casos reais não são fabricados",
        text: "Avaliações, testemunhos e casos de estudo só devem ser apresentados como reais quando existirem e houver base para os publicar. Páginas preparatórias ou exemplos editoriais não devem ser confundidos com experiência de cliente documentada.",
      },
      {
        title: "6. O conteúdo pode ser revisto",
        text: "Catálogo, técnicas, disponibilidade e práticas de mercado evoluem. Os conteúdos podem ser atualizados para corrigir informação, melhorar contexto ou refletir mudanças relevantes sem alterar o princípio de separar orientação de dados verificáveis.",
      },
    ],
    related: [
      {
        label: "Autor editorial",
        href: "/autores/360-merchandising",
        description: "Conheça a entidade responsável pelos conteúdos institucionais e guias.",
      },
      {
        label: "Qualidade e transparência",
        href: "/qualidade",
        description: "Veja como esta metodologia se aplica ao catálogo.",
      },
      {
        label: "Guias",
        href: "/guias",
        description: "Consultar os conteúdos publicados segundo esta abordagem.",
      },
      {
        label: "Casos de estudo",
        href: "/casos-de-estudo",
        description: "Veja os critérios definidos para publicar projetos reais sem fabricar resultados.",
      },
    ],
    primaryCta: {
      label: "Explorar os guias",
      href: "/guias",
      description: "Ver conteúdos editoriais publicados.",
    },
  },
];

export function getInstitutionalPages(): InstitutionalPageConfig[] {
  return PAGES;
}

export function getInstitutionalPage(slug: string): InstitutionalPageConfig | null {
  return PAGES.find((page) => page.slug === slug) ?? null;
}
