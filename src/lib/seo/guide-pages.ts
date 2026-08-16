export type GuideSection = {
  title: string;
  text: string;
  points?: string[];
};

export type GuideFaq = {
  question: string;
  answer: string;
};

export type GuideConfig = {
  slug: string;
  title: string;
  h1: string;
  description: string;
  eyebrow: string;
  intro: string;
  takeaways: string[];
  sections: GuideSection[];
  faq: GuideFaq[];
  productQueries: string[];
  relatedSlugs: string[];
};

const GUIDES: GuideConfig[] = [
  {
    slug: "como-escolher-brindes-personalizados-empresas",
    title: "Como escolher brindes personalizados para empresas",
    h1: "Como escolher brindes personalizados para empresas",
    description:
      "Guia prático para escolher brindes empresariais por objetivo, público, orçamento, quantidade, prazo, material e personalização.",
    eyebrow: "Guia · Brindes personalizados",
    intro:
      "Escolher um brinde empresarial não começa no produto. Começa no objetivo da ação, em quem vai receber, no contexto de utilização e nos limites reais de orçamento, quantidade e prazo. Este guia organiza esses critérios para reduzir escolhas aleatórias e tornar a comparação mais simples.",
    takeaways: [
      "Definir objetivo e público antes de procurar produtos",
      "Comparar custo unitário, quantidade e personalização em conjunto",
      "Confirmar stock e prazo antes de fechar a seleção",
      "Privilegiar utilidade e coerência com a marca",
    ],
    sections: [
      {
        title: "1. Comece pelo objetivo",
        text: "Um brinde para captação num evento não tem necessariamente os mesmos critérios de um presente para clientes estratégicos ou de um welcome kit para colaboradores. Defina primeiro o comportamento ou a experiência que pretende criar.",
        points: [
          "Notoriedade e alcance",
          "Agradecimento e fidelização",
          "Onboarding e cultura interna",
          "Evento, congresso ou ativação",
        ],
      },
      {
        title: "2. Defina orçamento, quantidade e prazo",
        text: "O orçamento deve ser analisado por unidade e pelo custo total da ação. A quantidade influencia a seleção disponível e pode alterar preços por escalão. O prazo deve incluir escolha, personalização, validação e expedição.",
      },
      {
        title: "3. Escolha produtos que façam sentido para quem recebe",
        text: "Utilidade, contexto e qualidade percebida ajudam a evitar brindes que são recebidos mas não usados. Pense no ambiente de trabalho, mobilidade, eventos, casa, desporto ou viagem conforme o perfil do destinatário.",
      },
      {
        title: "4. Valide a personalização antes de decidir",
        text: "Cada produto pode ter componentes, localizações e técnicas de personalização diferentes. A área disponível, o número de cores e a técnica compatível influenciam o resultado final e, em alguns casos, o custo.",
      },
    ],
    faq: [
      {
        question: "Qual é o melhor brinde para uma empresa?",
        answer:
          "Não existe um único melhor brinde. A escolha depende do objetivo, destinatário, orçamento, quantidade, prazo e contexto de utilização.",
      },
      {
        question: "Devo escolher primeiro o produto ou o orçamento?",
        answer:
          "É mais eficiente definir uma faixa de orçamento por unidade e a quantidade prevista antes de comparar produtos.",
      },
      {
        question: "O stock deve ser confirmado antes da personalização?",
        answer:
          "Sim. Stock, quantidade e disponibilidade devem ser confirmados antes de fechar a configuração da encomenda.",
      },
      {
        question: "A mesma técnica de personalização funciona em todos os produtos?",
        answer:
          "Não. As técnicas disponíveis dependem do produto, componente, localização e área de personalização.",
      },
    ],
    productQueries: ["caneta", "caderno", "garrafa", "saco", "mochila", "caneca"],
    relatedSlugs: [
      "merchandising-corporativo-guia",
      "como-planear-merchandising-por-orcamento",
      "brindes-para-eventos-guia",
    ],
  },
  {
    slug: "merchandising-corporativo-guia",
    title: "Merchandising corporativo: guia para empresas",
    h1: "Merchandising corporativo: como transformar produtos em experiência de marca",
    description:
      "Guia de merchandising corporativo para empresas: objetivos, públicos, seleção de produtos, personalização, consistência e medição.",
    eyebrow: "Guia · Merchandising corporativo",
    intro:
      "Merchandising corporativo é mais eficaz quando faz parte de uma experiência de marca e não de uma compra isolada de objetos. A seleção deve ligar o produto ao momento, ao público e à identidade da organização.",
    takeaways: [
      "Tratar merchandising como ponto de contacto de marca",
      "Criar critérios consistentes para diferentes campanhas",
      "Adaptar o produto ao momento e ao destinatário",
      "Medir utilização, procura e resposta sempre que possível",
    ],
    sections: [
      {
        title: "1. Defina o papel do merchandising",
        text: "O mesmo catálogo pode servir objetivos muito diferentes: apoiar vendas, receber novos colaboradores, equipar um evento, agradecer a clientes ou reforçar cultura interna. O papel do merchandising deve ficar claro antes da seleção.",
      },
      {
        title: "2. Crie uma lógica de portefólio",
        text: "Em vez de escolher produtos do zero em cada campanha, organize famílias por nível de investimento, público, ocasião e frequência de utilização. Isto melhora consistência e acelera decisões futuras.",
      },
      {
        title: "3. Proteja a coerência visual",
        text: "Material, cor, dimensão da marca e técnica de personalização devem respeitar o uso real do produto. Uma aplicação visualmente maior nem sempre é a solução mais adequada.",
      },
      {
        title: "4. Ligue merchandising a dados",
        text: "Registe produtos escolhidos, quantidades, custos, públicos e resultados. Com histórico suficiente, a empresa consegue perceber o que é mais procurado, utilizado e repetido.",
      },
    ],
    faq: [
      {
        question: "Merchandising corporativo é o mesmo que brindes promocionais?",
        answer:
          "Os conceitos podem sobrepor-se, mas merchandising corporativo pode abranger um sistema mais amplo de produtos de marca para clientes, equipas, eventos e outros pontos de contacto.",
      },
      {
        question: "Como manter consistência entre campanhas?",
        answer:
          "Defina regras de seleção por público, orçamento, materiais, cores, técnicas e níveis de qualidade percebida.",
      },
      {
        question: "É útil criar uma lista de produtos aprovados?",
        answer:
          "Sim. Um portefólio interno de opções aprovadas reduz decisões repetidas e ajuda a manter consistência.",
      },
    ],
    productQueries: ["polo", "garrafa", "caderno", "mochila", "caneta", "t-shirt"],
    relatedSlugs: [
      "como-escolher-brindes-personalizados-empresas",
      "welcome-kit-empresarial",
      "brindes-ecologicos-sustentaveis",
    ],
  },
  {
    slug: "welcome-kit-empresarial",
    title: "Welcome kit empresarial: o que incluir e como planear",
    h1: "Welcome kit empresarial: o que incluir e como criar um kit coerente",
    description:
      "Guia para criar welcome kits de colaboradores: composição, orçamento, utilidade, personalização, quantidades e planeamento.",
    eyebrow: "Guia · Welcome kits",
    intro:
      "Um welcome kit deve facilitar a chegada, comunicar cultura e oferecer utilidade real. A composição não precisa de ter muitos artigos: precisa de ter uma lógica clara e adequada ao contexto de quem recebe.",
    takeaways: [
      "Definir um objetivo claro para o kit",
      "Escolher poucos artigos com utilidade real",
      "Criar uma faixa de investimento por pessoa",
      "Planear stock e reposição para novos onboardings",
    ],
    sections: [
      {
        title: "1. Estruture o kit por função",
        text: "Pode combinar um artigo de trabalho, um produto de hidratação, um elemento têxtil e um item de marca. A composição deve evitar redundância e excesso de peças sem utilização prevista.",
      },
      {
        title: "2. Pense no onboarding como processo contínuo",
        text: "Se a empresa recebe pessoas ao longo do ano, escolha artigos com disponibilidade previsível e crie uma lógica de reposição. Isto reduz a necessidade de redesenhar o kit a cada entrada.",
      },
      {
        title: "3. Defina níveis de investimento",
        text: "Um modelo base, um modelo intermédio e um modelo premium ajudam a adaptar o kit a diferentes funções, momentos ou públicos sem perder coerência visual.",
      },
      {
        title: "4. Personalize com intenção",
        text: "A marca pode aparecer de formas diferentes em cada produto. A técnica, área e localização disponíveis devem ser verificadas antes de fechar o design final do conjunto.",
      },
    ],
    faq: [
      {
        question: "O que costuma fazer sentido num welcome kit?",
        answer:
          "Artigos de trabalho, escrita, hidratação, transporte ou vestuário são famílias frequentes, mas a composição deve refletir o contexto real da equipa.",
      },
      {
        question: "Quantos produtos deve ter um welcome kit?",
        answer:
          "Não existe um número obrigatório. É preferível ter poucos produtos úteis e coerentes do que aumentar a quantidade sem objetivo.",
      },
      {
        question: "Posso criar diferentes versões do mesmo kit?",
        answer:
          "Sim. Pode manter uma identidade comum e variar produtos ou níveis de investimento conforme o público.",
      },
    ],
    productQueries: ["caderno", "caneta", "garrafa", "mochila", "saco", "polo"],
    relatedSlugs: [
      "merchandising-corporativo-guia",
      "brindes-ecologicos-sustentaveis",
      "como-planear-merchandising-por-orcamento",
    ],
  },
  {
    slug: "brindes-ecologicos-sustentaveis",
    title: "Brindes ecológicos e sustentáveis: como comparar",
    h1: "Brindes ecológicos e sustentáveis: critérios para uma escolha mais informada",
    description:
      "Guia para comparar brindes sustentáveis através de materiais, certificações, reutilização, origem e informação ambiental disponível.",
    eyebrow: "Guia · Sustentabilidade",
    intro:
      "Sustentabilidade não deve ser reduzida a uma cor, material ou palavra no nome do produto. A comparação torna-se mais útil quando considera composição, certificações, reutilização, durabilidade e os dados ambientais que estejam efetivamente disponíveis para cada referência.",
    takeaways: [
      "Verificar materiais e percentagens quando disponíveis",
      "Distinguir certificações de mensagens genéricas",
      "Considerar vida útil e reutilização",
      "Evitar afirmações ambientais não suportadas por dados",
    ],
    sections: [
      {
        title: "1. Leia a composição",
        text: "Termos como reciclado, rPET, algodão reciclado, bambu ou cortiça descrevem aspetos diferentes. Compare a composição concreta do produto e não apenas o nome comercial.",
      },
      {
        title: "2. Procure informação verificável",
        text: "Quando existem campos como FSC, materiais reciclados, pegada de CO₂ ou consumo de água, estes ajudam a tornar a comparação mais objetiva. Nem todos os produtos têm o mesmo nível de informação disponível.",
      },
      {
        title: "3. Considere utilização e durabilidade",
        text: "Um produto reutilizável que é efetivamente usado pode ser mais coerente com a intenção da campanha do que um artigo escolhido apenas por uma mensagem ambiental genérica.",
      },
      {
        title: "4. Comunique apenas o que consegue sustentar",
        text: "A comunicação da campanha deve usar descrições, materiais e certificações que estejam documentados para o produto selecionado, evitando extrapolações.",
      },
    ],
    faq: [
      {
        question: "Um produto reciclado é automaticamente sustentável?",
        answer:
          "Não. O material é apenas um dos critérios. Utilização, durabilidade, composição, certificações e contexto também devem ser considerados.",
      },
      {
        question: "Que dados ambientais podem ajudar na comparação?",
        answer:
          "Quando disponíveis, informação de materiais reciclados, FSC, CO₂, H₂O e outras propriedades documentadas pode ajudar a comparar referências.",
      },
      {
        question: "Devo usar claims ambientais no merchandising?",
        answer:
          "A comunicação deve limitar-se a afirmações suportadas pela informação e certificação efetivamente disponíveis para o produto.",
      },
    ],
    productQueries: ["reciclado", "rpet", "bambu", "cortiça", "algodão reciclado", "fsc"],
    relatedSlugs: [
      "como-escolher-brindes-personalizados-empresas",
      "merchandising-corporativo-guia",
      "welcome-kit-empresarial",
    ],
  },
  {
    slug: "brindes-para-eventos-guia",
    title: "Brindes para eventos: guia de planeamento",
    h1: "Brindes para eventos: como escolher, quantificar e planear",
    description:
      "Guia para escolher brindes para eventos, congressos e ativações com base em público, distribuição, quantidade, orçamento e prazo.",
    eyebrow: "Guia · Eventos",
    intro:
      "Num evento, o produto é apenas uma parte do sistema. É necessário decidir quem recebe, em que momento, como será distribuído e que papel terá depois do evento. Estas decisões ajudam a escolher melhor e a estimar quantidades com menos desperdício.",
    takeaways: [
      "Mapear momentos de distribuição",
      "Separar públicos quando existem níveis diferentes",
      "Calcular margem de segurança de forma consciente",
      "Fechar personalização e prazo antes da data crítica",
    ],
    sections: [
      {
        title: "1. Desenhe o percurso do participante",
        text: "Receção, credenciação, sessões, networking e saída podem justificar produtos diferentes. Identifique onde o merchandising acrescenta utilidade em vez de distribuir tudo no mesmo momento.",
      },
      {
        title: "2. Calcule quantidades por público",
        text: "Participantes, oradores, equipa, imprensa, parceiros e convidados podem ter necessidades distintas. Separar estas populações ajuda a evitar encomendas excessivas ou insuficientes.",
      },
      {
        title: "3. Escolha produtos fáceis de transportar e usar",
        text: "Lanyards, sacos, blocos, canetas, garrafas e outros artigos funcionais podem acompanhar a experiência. O peso, volume e logística também devem entrar na decisão.",
      },
      {
        title: "4. Trabalhe de trás para a frente a partir da data",
        text: "A data do evento deve determinar o calendário de seleção, arte final, validação, personalização e expedição. Não deixe a escolha do produto para o fim do processo.",
      },
    ],
    faq: [
      {
        question: "Como calcular a quantidade de brindes para um evento?",
        answer:
          "Comece pelos participantes confirmados e separe os diferentes públicos. Depois defina conscientemente qualquer margem adicional.",
      },
      {
        question: "É melhor oferecer um produto ou um kit?",
        answer:
          "Depende do objetivo, orçamento e logística. Um único produto útil pode ser mais eficaz do que um kit sem uma função clara.",
      },
      {
        question: "Quando devo fechar a encomenda?",
        answer:
          "O prazo deve considerar configuração, personalização, validação e expedição. Quanto mais complexa a ação, maior deve ser a antecedência.",
      },
    ],
    productQueries: ["lanyard", "saco", "caderno", "caneta", "garrafa", "t-shirt"],
    relatedSlugs: [
      "como-escolher-brindes-personalizados-empresas",
      "como-planear-merchandising-por-orcamento",
      "merchandising-corporativo-guia",
    ],
  },
  {
    slug: "como-planear-merchandising-por-orcamento",
    title: "Como planear merchandising por orçamento e quantidade",
    h1: "Como planear merchandising por orçamento, quantidade e custo por pessoa",
    description:
      "Método prático para transformar um orçamento total em critérios de seleção de merchandising, quantidades e custo unitário.",
    eyebrow: "Guia · Orçamento",
    intro:
      "O orçamento torna-se mais útil quando é convertido em limites operacionais: número de destinatários, investimento por pessoa, número de artigos e margem para personalização. Assim, a pesquisa começa com critérios claros.",
    takeaways: [
      "Separar orçamento total de custo por pessoa",
      "Definir quantidade antes de comparar preços",
      "Reservar margem para personalização e logística",
      "Criar cenários base, intermédio e premium",
    ],
    sections: [
      {
        title: "1. Calcule o investimento por destinatário",
        text: "Divida o orçamento disponível pelo número de pessoas antes de escolher produtos. Este valor cria uma primeira faixa de decisão e evita comparar opções incompatíveis com a escala da ação.",
      },
      {
        title: "2. Não olhe apenas para o preço do produto",
        text: "A configuração final pode incluir personalização e outros elementos associados à encomenda. Compare sempre o custo final da solução que pretende efetivamente comprar.",
      },
      {
        title: "3. Crie três cenários",
        text: "Um cenário essencial, um intermédio e um premium ajudam a visualizar trade-offs entre quantidade de artigos, qualidade percebida e investimento por pessoa.",
      },
      {
        title: "4. Use o orçamento como filtro, não como único critério",
        text: "Depois de eliminar opções fora do orçamento, compare utilidade, materiais, disponibilidade, prazo e adequação à marca.",
      },
    ],
    faq: [
      {
        question: "Como calcular o orçamento por pessoa?",
        answer:
          "Divida o orçamento disponível pelo número previsto de destinatários e reserve margem para os elementos que façam parte da configuração final.",
      },
      {
        question: "Uma quantidade maior pode alterar o preço unitário?",
        answer:
          "Os produtos podem ter escalões de quantidade e preços diferentes. A comparação deve ser feita para a quantidade efetivamente necessária.",
      },
      {
        question: "É útil comparar três cenários?",
        answer:
          "Sim. Cenários com diferentes níveis de investimento tornam os trade-offs mais visíveis antes da decisão final.",
      },
    ],
    productQueries: ["caneta", "saco", "caderno", "garrafa", "lanyard", "caneca"],
    relatedSlugs: [
      "como-escolher-brindes-personalizados-empresas",
      "brindes-para-eventos-guia",
      "welcome-kit-empresarial",
    ],
  },
];

export function getGuides(): GuideConfig[] {
  return GUIDES;
}

export function getGuide(slug: string): GuideConfig | null {
  return GUIDES.find((guide) => guide.slug === slug) ?? null;
}

export function getRelatedGuides(config: GuideConfig): GuideConfig[] {
  return config.relatedSlugs
    .map((slug) => getGuide(slug))
    .filter((guide): guide is GuideConfig => Boolean(guide));
}
