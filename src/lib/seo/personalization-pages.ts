export type PersonalizationConfig = {
  slug: string;
  title: string;
  h1: string;
  description: string;
  intro: string;
  sections: Array<{ title: string; text: string }>;
  checkpoints: string[];
  relatedSlugs: string[];
};

const TECHNIQUES: PersonalizationConfig[] = [
  {
    slug: "serigrafia",
    title: "Serigrafia em brindes personalizados",
    h1: "Serigrafia em merchandising e brindes personalizados",
    description:
      "Entenda como avaliar uma opção de serigrafia através do produto, componente, localização, área de impressão, cores e quantidade.",
    intro:
      "A serigrafia é uma das técnicas que pode surgir nas opções de personalização do catálogo. A disponibilidade e configuração concreta dependem sempre da referência, do componente, da localização e das tabelas associadas ao produto.",
    sections: [
      {
        title: "O que deve validar",
        text: "Antes de escolher a técnica, confirme em que componente e localização é permitida, qual a área disponível e quantas cores são suportadas na configuração selecionada.",
      },
      {
        title: "Área e número de cores",
        text: "As tabelas de personalização podem variar por área e por número de cores. A configuração final deve respeitar os limites indicados para o produto escolhido.",
      },
      {
        title: "Preço e quantidade",
        text: "O preço de personalização pode depender da tabela aplicável e da quantidade. A página do produto deve ser a referência para a combinação que está efetivamente a configurar.",
      },
    ],
    checkpoints: [
      "Produto e variante corretos",
      "Componente e localização",
      "Área disponível",
      "Número de cores",
      "Quantidade pretendida",
    ],
    relatedSlugs: ["tampografia", "gravacao-laser", "transfer"],
  },
  {
    slug: "tampografia",
    title: "Tampografia em brindes personalizados",
    h1: "Tampografia: como avaliar a opção de personalização",
    description:
      "Guia de avaliação de tampografia em produtos personalizados: localização, área, cores, quantidade e configuração disponível.",
    intro:
      "Quando a tampografia está disponível para uma referência, deve ser tratada como uma combinação concreta entre produto, localização e técnica. A existência da técnica num produto não significa que esteja disponível em todas as zonas ou variantes.",
    sections: [
      {
        title: "Confirme a combinação disponível",
        text: "A personalização é definida ao nível da referência e das suas possibilidades de componente e localização. Escolha sempre a opção apresentada para a configuração concreta do produto.",
      },
      {
        title: "Trabalhe com a área real",
        text: "A arte deve ser preparada para a área indicada na opção selecionada. Evite assumir dimensões com base apenas na fotografia geral do produto.",
      },
      {
        title: "Compare alternativas",
        text: "Se o produto disponibilizar mais do que uma técnica ou localização, compare o resultado pretendido, o número de cores, a área e o custo antes de decidir.",
      },
    ],
    checkpoints: [
      "Variante selecionada",
      "Localização disponível",
      "Dimensão da área",
      "Cores da personalização",
      "Tabela de preço aplicável",
    ],
    relatedSlugs: ["serigrafia", "gravacao-laser", "hot-stamping"],
  },
  {
    slug: "gravacao-laser",
    title: "Gravação laser em brindes personalizados",
    h1: "Gravação laser em merchandising personalizado",
    description:
      "Saiba como verificar opções de gravação laser por produto, componente, localização, área e configuração disponível.",
    intro:
      "A gravação laser pode aparecer associada a diferentes componentes e localizações do mesmo produto. A opção correta é aquela que corresponde à variante e à zona que pretende personalizar.",
    sections: [
      {
        title: "O mesmo produto pode ter várias zonas",
        text: "Um conjunto ou produto com vários componentes pode ter mais do que uma localização personalizável. Cada combinação deve ser tratada individualmente.",
      },
      {
        title: "Use a imagem da localização",
        text: "Quando disponível, a imagem de localização ou de linhas de impressão ajuda a perceber a zona prevista para a personalização e reduz ambiguidades na preparação da arte.",
      },
      {
        title: "Valide antes de encomendar",
        text: "Confirme a área, a técnica e a variante selecionada antes de concluir a configuração. O catálogo e a ferramenta de personalização devem refletir a opção efetivamente suportada.",
      },
    ],
    checkpoints: [
      "Componente correto",
      "Localização correta",
      "Imagem da área de personalização",
      "Dimensão disponível",
      "Quantidade e preço final",
    ],
    relatedSlugs: ["serigrafia", "transfer", "hot-stamping"],
  },
  {
    slug: "transfer",
    title: "Transfer em têxteis e brindes personalizados",
    h1: "Transfer: como interpretar as opções de personalização",
    description:
      "Guia para avaliar opções de transfer no catálogo através da área, localização, técnica, variante e quantidade.",
    intro:
      "O transfer pode surgir como técnica disponível em determinados produtos e zonas. Tal como nas restantes técnicas, a configuração deve ser lida a partir da combinação concreta de produto, componente, localização e área.",
    sections: [
      {
        title: "Não generalize entre referências",
        text: "Dois produtos visualmente semelhantes podem ter opções de personalização diferentes. Confirme sempre as possibilidades da referência selecionada.",
      },
      {
        title: "Área e localização são decisivas",
        text: "A zona escolhida determina a área disponível e pode alterar a opção de personalização. Prepare a arte de acordo com a localização selecionada.",
      },
      {
        title: "Compare o custo final",
        text: "A escolha da técnica deve ser feita juntamente com a quantidade e o preço final da configuração, e não apenas pela designação da técnica.",
      },
    ],
    checkpoints: [
      "Referência e cor",
      "Componente",
      "Localização",
      "Área disponível",
      "Preço para a quantidade",
    ],
    relatedSlugs: ["serigrafia", "gravacao-laser", "tampografia"],
  },
  {
    slug: "hot-stamping",
    title: "Hot stamping em brindes personalizados",
    h1: "Hot stamping: localização, área e configuração",
    description:
      "Guia para interpretar opções de hot stamping em brindes personalizados e validar área, localização e configuração disponível.",
    intro:
      "O hot stamping pode estar disponível apenas em determinadas localizações de uma referência. A escolha deve seguir as opções efetivamente apresentadas para o produto e a variante selecionados.",
    sections: [
      {
        title: "Localização específica",
        text: "Uma técnica pode estar disponível numa zona do produto e não noutra. Confirme a localização antes de preparar a arte final.",
      },
      {
        title: "Dimensão da personalização",
        text: "A área disponível faz parte da configuração. O ficheiro enviado deve respeitar a zona de personalização indicada para a opção escolhida.",
      },
      {
        title: "Configuração e preço",
        text: "A tabela associada à personalização e a quantidade influenciam a configuração final. Utilize os dados apresentados no produto para a decisão de compra.",
      },
    ],
    checkpoints: [
      "Produto e variante",
      "Zona permitida",
      "Área de personalização",
      "Configuração da técnica",
      "Quantidade",
    ],
    relatedSlugs: ["gravacao-laser", "serigrafia", "tampografia"],
  },
];

export function getPersonalizationPages(): PersonalizationConfig[] {
  return TECHNIQUES;
}

export function getPersonalizationPage(
  slug: string,
): PersonalizationConfig | null {
  return TECHNIQUES.find((technique) => technique.slug === slug) ?? null;
}

export function getRelatedPersonalizationPages(
  config: PersonalizationConfig,
): PersonalizationConfig[] {
  return config.relatedSlugs
    .map((slug) => getPersonalizationPage(slug))
    .filter((page): page is PersonalizationConfig => Boolean(page));
}
