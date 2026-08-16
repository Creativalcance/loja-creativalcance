export type SelectionFaq = {
  question: string;
  answer: string;
};

export type SelectionConfig = {
  slug: string;
  title: string;
  h1: string;
  description: string;
  eyebrow: string;
  intro: string;
  methodology: string;
  criteria: string[];
  productQueries: string[];
  faq: SelectionFaq[];
  relatedSlugs: string[];
  relatedSolutionHref: string;
  relatedSolutionLabel: string;
};

const SELECTION_PAGES: SelectionConfig[] = [
  {
    slug: "melhores-brindes-para-empresas",
    title: "Melhores brindes para empresas: critérios e opções",
    h1: "Melhores brindes para empresas: como escolher opções realmente adequadas",
    description:
      "Seleção orientada de brindes para empresas com critérios de utilidade, personalização, stock e adequação ao contexto, sem rankings artificiais.",
    eyebrow: "Seleção 360 · Empresas",
    intro:
      "A procura pelo melhor brinde empresarial só faz sentido quando os critérios estão definidos. Em vez de apresentar um ranking universal, esta seleção cruza famílias de produto habitualmente úteis em contexto empresarial com disponibilidade, personalização e adequação a diferentes utilizações.",
    methodology:
      "Os produtos são obtidos do catálogo ativo através de termos relacionados com utilização empresarial. A ordem favorece referências com stock disponível e destaques do catálogo, mas não representa uma classificação absoluta de qualidade.",
    criteria: [
      "Utilidade provável para quem recebe",
      "Possibilidade de personalização",
      "Stock disponível antes de referências sem stock",
      "Versatilidade para clientes, equipas e eventos",
      "Compatibilidade com diferentes níveis de investimento",
    ],
    productQueries: ["caneta", "caderno", "garrafa", "saco", "mochila", "polo"],
    faq: [
      {
        question: "Existe um único melhor brinde para todas as empresas?",
        answer:
          "Não. O produto mais adequado depende do objetivo, destinatário, quantidade, orçamento, prazo e contexto de utilização.",
      },
      {
        question: "Esta página é um ranking de produtos?",
        answer:
          "Não. É uma seleção orientada por critérios e dados do catálogo ativo. A escolha final deve ser validada na ficha de cada produto.",
      },
      {
        question: "Devo privilegiar preço ou utilidade?",
        answer:
          "O preço deve ser compatível com o orçamento, mas a utilidade e a adequação ao destinatário ajudam a aumentar a probabilidade de o produto ser realmente usado.",
      },
    ],
    relatedSlugs: [
      "melhores-brindes-para-eventos",
      "melhores-brindes-para-colaboradores",
      "melhores-brindes-sustentaveis",
    ],
    relatedSolutionHref: "/solucoes/brindes-para-empresas",
    relatedSolutionLabel: "Ver solução de brindes para empresas",
  },
  {
    slug: "melhores-brindes-para-eventos",
    title: "Melhores brindes para eventos: critérios e opções",
    h1: "Melhores brindes para eventos: opções úteis antes, durante e depois",
    description:
      "Critérios para selecionar brindes para eventos com foco em distribuição, transporte, utilidade, personalização e disponibilidade.",
    eyebrow: "Seleção 360 · Eventos",
    intro:
      "Num evento, um bom brinde deve encaixar no percurso do participante e na logística da ação. A seleção privilegia famílias compactas, personalizáveis e frequentemente utilizadas em receção, credenciação, networking e apoio ao participante.",
    methodology:
      "A seleção cruza termos do catálogo relacionados com eventos e dá prioridade visual a produtos com stock. Não substitui a confirmação de quantidade, prazo, técnica de personalização ou logística do evento.",
    criteria: [
      "Facilidade de transporte e distribuição",
      "Utilidade durante ou depois do evento",
      "Personalização adequada à identidade da ação",
      "Compatibilidade com grandes ou médias quantidades",
      "Stock e prazo validados antes da data crítica",
    ],
    productQueries: ["lanyard", "saco", "caneta", "bloco", "garrafa", "caderno"],
    faq: [
      {
        question: "Que tipo de brinde funciona melhor num evento?",
        answer:
          "Produtos compactos, úteis e fáceis de distribuir tendem a funcionar bem, mas a escolha depende do formato do evento e do momento em que serão entregues.",
      },
      {
        question: "É melhor entregar um produto ou um kit?",
        answer:
          "Depende do objetivo e da logística. Um único artigo útil pode ser mais eficiente do que um kit com vários produtos sem função clara.",
      },
      {
        question: "Quando devo confirmar o stock?",
        answer:
          "Antes de fechar a personalização e sempre com antecedência suficiente para produção, validação e expedição.",
      },
    ],
    relatedSlugs: [
      "melhores-brindes-para-congressos",
      "melhores-brindes-para-empresas",
      "melhores-brindes-tecnologicos",
    ],
    relatedSolutionHref: "/solucoes/brindes-para-feiras",
    relatedSolutionLabel: "Ver solução para feiras e eventos",
  },
  {
    slug: "melhores-brindes-para-congressos",
    title: "Melhores brindes para congressos: critérios e opções",
    h1: "Melhores brindes para congressos: seleção para participantes e organização",
    description:
      "Seleção de brindes para congressos orientada por credenciação, utilidade, transporte, personalização e quantidade.",
    eyebrow: "Seleção 360 · Congressos",
    intro:
      "Congressos combinam receção, documentação, networking e deslocação ao longo de várias horas ou dias. Esta seleção reúne categorias que podem apoiar essas necessidades sem assumir que existe um produto universalmente melhor.",
    methodology:
      "Os produtos são pesquisados no catálogo ativo através de famílias relacionadas com congressos. A ordenação favorece stock disponível e destaques, mantendo a confirmação final de quantidade e personalização na página do produto.",
    criteria: [
      "Apoio à credenciação e identificação",
      "Utilidade em sessões e apontamentos",
      "Transporte simples para o participante",
      "Coerência com o nível do congresso",
      "Planeamento por número real de participantes",
    ],
    productQueries: ["lanyard", "caderno", "bloco", "caneta", "saco", "garrafa"],
    faq: [
      {
        question: "O que costuma fazer sentido num kit de congresso?",
        answer:
          "Lanyard, bloco ou caderno, caneta, saco e soluções de hidratação são famílias frequentes, mas a composição deve refletir o programa e o público.",
      },
      {
        question: "Devo encomendar exatamente o número de inscritos?",
        answer:
          "A quantidade deve partir dos participantes confirmados e de uma margem adicional decidida conscientemente para equipa, convidados ou imprevistos.",
      },
      {
        question: "A personalização pode variar por produto?",
        answer:
          "Sim. A técnica, área e localização disponíveis dependem da referência e devem ser validadas individualmente.",
      },
    ],
    relatedSlugs: [
      "melhores-brindes-para-eventos",
      "melhores-brindes-para-empresas",
      "melhores-brindes-sustentaveis",
    ],
    relatedSolutionHref: "/aplicacoes/congressos",
    relatedSolutionLabel: "Explorar aplicação para congressos",
  },
  {
    slug: "melhores-brindes-para-colaboradores",
    title: "Melhores brindes para colaboradores: critérios e opções",
    h1: "Melhores brindes para colaboradores: utilidade, cultura e reconhecimento",
    description:
      "Critérios para escolher brindes para colaboradores, onboarding, reconhecimento e eventos internos com opções do catálogo ativo.",
    eyebrow: "Seleção 360 · Colaboradores",
    intro:
      "Para colaboradores, o merchandising deve funcionar no quotidiano e reforçar a relação com a organização. A seleção reúne famílias adequadas a onboarding, trabalho, mobilidade, eventos internos e reconhecimento.",
    methodology:
      "A seleção combina termos ligados a trabalho, mobilidade e vestuário. Não mede satisfação dos colaboradores nem substitui a segmentação por função, contexto ou necessidades reais da equipa.",
    criteria: [
      "Utilidade no trabalho ou fora dele",
      "Conforto e adequação ao contexto da equipa",
      "Consistência com a identidade interna",
      "Possibilidade de reposição em onboarding contínuo",
      "Personalização com leitura e uso equilibrados",
    ],
    productQueries: ["caderno", "garrafa", "mochila", "polo", "t-shirt", "saco"],
    faq: [
      {
        question: "Que brindes fazem sentido para onboarding?",
        answer:
          "Artigos de escrita, hidratação, transporte, trabalho e vestuário podem ser úteis, desde que a composição seja adaptada à realidade da equipa.",
      },
      {
        question: "É melhor oferecer o mesmo a toda a equipa?",
        answer:
          "Pode existir uma base comum e diferentes níveis ou variantes quando funções, tamanhos ou contextos justificam essa adaptação.",
      },
      {
        question: "Como evitar merchandising interno pouco utilizado?",
        answer:
          "Defina primeiro a função do produto e valide se ele se encaixa no quotidiano real dos colaboradores antes de escolher pela aparência.",
      },
    ],
    relatedSlugs: [
      "melhores-brindes-para-empresas",
      "melhores-brindes-sustentaveis",
      "melhores-brindes-tecnologicos",
    ],
    relatedSolutionHref: "/aplicacoes/colaboradores",
    relatedSolutionLabel: "Explorar aplicação para colaboradores",
  },
  {
    slug: "melhores-brindes-sustentaveis",
    title: "Melhores brindes sustentáveis: critérios e opções",
    h1: "Melhores brindes sustentáveis: comparar materiais e dados antes de escolher",
    description:
      "Seleção de brindes associados a materiais e atributos ambientais, com critérios de composição, reutilização e informação verificável.",
    eyebrow: "Seleção 360 · Sustentabilidade",
    intro:
      "Não existe um ranking universal de sustentabilidade. Esta seleção usa termos ambientais presentes no catálogo para encontrar referências relevantes e enquadra a decisão com critérios de composição, reutilização, durabilidade e informação documentada.",
    methodology:
      "A presença nesta página resulta de termos do catálogo como reciclado, rPET, bambu, cortiça, algodão reciclado ou FSC. Isso não constitui, por si só, uma certificação ambiental nem uma avaliação de ciclo de vida.",
    criteria: [
      "Composição e percentagem de material quando disponível",
      "Certificações apenas quando documentadas",
      "Reutilização e vida útil provável",
      "Adequação ao uso para evitar desperdício",
      "Comunicação ambiental limitada a dados verificáveis",
    ],
    productQueries: ["reciclado", "rpet", "bambu", "cortiça", "algodão reciclado", "fsc"],
    faq: [
      {
        question: "Um produto com material reciclado é automaticamente o mais sustentável?",
        answer:
          "Não. Material, quantidade, durabilidade, reutilização, origem, certificações e contexto de uso são critérios diferentes e devem ser analisados em conjunto.",
      },
      {
        question: "O que significa aparecer nesta seleção?",
        answer:
          "Significa que o produto foi encontrado através de termos ambientais presentes no catálogo. A informação específica deve ser confirmada na ficha individual.",
      },
      {
        question: "Posso comunicar qualquer claim ambiental?",
        answer:
          "Não. A comunicação deve limitar-se às características e certificações efetivamente documentadas para a referência escolhida.",
      },
    ],
    relatedSlugs: [
      "melhores-brindes-para-empresas",
      "melhores-brindes-para-colaboradores",
      "melhores-brindes-para-eventos",
    ],
    relatedSolutionHref: "/solucoes/brindes-ecologicos",
    relatedSolutionLabel: "Ver solução de brindes ecológicos",
  },
  {
    slug: "melhores-brindes-tecnologicos",
    title: "Melhores brindes tecnológicos: critérios e opções",
    h1: "Melhores brindes tecnológicos: utilidade, especificações e contexto",
    description:
      "Seleção de brindes tecnológicos personalizáveis com critérios de utilidade, especificações, compatibilidade e contexto de utilização.",
    eyebrow: "Seleção 360 · Tecnologia",
    intro:
      "Tecnologia pode aumentar o valor percebido de uma oferta, mas só quando a especificação e a utilização fazem sentido. Esta seleção reúne acessórios tecnológicos e ajuda a comparar utilidade, compatibilidade e nível de investimento.",
    methodology:
      "Os produtos são encontrados através de termos tecnológicos do catálogo. A seleção não testa desempenho técnico nem substitui a leitura das especificações de cada referência.",
    criteria: [
      "Utilidade concreta para o destinatário",
      "Especificações e compatibilidade verificadas",
      "Personalização sem comprometer a função",
      "Nível de investimento coerente com o público",
      "Stock e disponibilidade antes da campanha",
    ],
    productQueries: ["powerbank", "carregador", "cabo", "usb", "wireless", "suporte"],
    faq: [
      {
        question: "Que especificações devo comparar em brindes tecnológicos?",
        answer:
          "Depende do produto, mas capacidade, conectividade, compatibilidade, materiais e formato são exemplos de dados que devem ser lidos antes da escolha.",
      },
      {
        question: "Um produto tecnológico mais caro é sempre melhor?",
        answer:
          "Não. O valor deve ser comparado com a utilidade, especificações, público e objetivo da ação.",
      },
      {
        question: "Todos os acessórios tecnológicos podem ser personalizados da mesma forma?",
        answer:
          "Não. Técnicas, localizações e áreas de personalização variam por referência.",
      },
    ],
    relatedSlugs: [
      "melhores-brindes-para-empresas",
      "melhores-brindes-para-eventos",
      "melhores-brindes-para-colaboradores",
    ],
    relatedSolutionHref: "/solucoes/brindes-tecnologicos",
    relatedSolutionLabel: "Ver solução de brindes tecnológicos",
  },
];

export function getSelectionPages(): SelectionConfig[] {
  return SELECTION_PAGES;
}

export function getSelectionPage(slug: string): SelectionConfig | null {
  return SELECTION_PAGES.find((page) => page.slug === slug) ?? null;
}

export function getRelatedSelectionPages(
  config: SelectionConfig,
): SelectionConfig[] {
  return config.relatedSlugs
    .map((slug) => getSelectionPage(slug))
    .filter((page): page is SelectionConfig => Boolean(page));
}
