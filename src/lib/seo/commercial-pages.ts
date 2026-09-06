export type CommercialLandingGroup =
  | "commercial"
  | "budget"
  | "quantity"
  | "occasion";

export type CommercialProductFilter = {
  maxUnitPrice?: number;
  targetQuantity?: number;
  requireCustomizable?: boolean;
};

export type CommercialLandingConfig = {
  slug: string;
  group: CommercialLandingGroup;
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
  productFilter?: CommercialProductFilter;
  selectionNote: string;
  relatedSlugs: string[];
};

const COMMERCIAL_PAGES: CommercialLandingConfig[] = [
  {
    slug: "brindes-para-empresas",
    group: "commercial",
    title: "Brindes para empresas personalizados",
    h1: "Brindes personalizados para empresas",
    description:
      "Explore brindes para empresas por utilização, público, material e personalização, com acesso a produtos do catálogo ativo da 360 Merchandising.",
    eyebrow: "Soluções · Empresas",
    intro:
      "Os brindes para empresas podem apoiar notoriedade, fidelização, eventos, onboarding e relações comerciais. A escolha deve partir do objetivo, de quem recebe, da quantidade necessária e do nível de investimento disponível.",
    sections: [
      {
        title: "Escolher pela utilização real",
        text: "Canetas, cadernos, garrafas, sacos, têxteis, acessórios tecnológicos e outros artigos respondem a contextos diferentes. Priorize produtos que façam sentido no quotidiano do destinatário e na experiência que a marca pretende criar.",
      },
      {
        title: "Comparar quantidade, preço e personalização",
        text: "O custo unitário pode variar com a quantidade e a configuração. Antes de decidir, compare mínimos de encomenda, stock, escalões de preço e opções de personalização disponíveis para cada referência.",
      },
      {
        title: "Da seleção à encomenda",
        text: "Depois de reduzir a lista a algumas opções, valide materiais, cores, técnica de personalização, área disponível e prazo. O Smart Merch pode ajudar a cruzar estes critérios com orçamento e quantidade.",
      },
    ],
    highlights: [
      "Campanhas comerciais e institucionais",
      "Clientes, parceiros e colaboradores",
      "Eventos, feiras e ações de marca",
      "Produtos personalizáveis para diferentes orçamentos",
    ],
    productQueries: ["caneta", "caderno", "garrafa", "saco", "mochila", "t-shirt"],
    productFilter: { requireCustomizable: true },
    selectionNote:
      "A seleção apresenta produtos personalizáveis do catálogo ativo relacionados com utilizações empresariais. Confirme sempre preço, stock, quantidade mínima e configuração final na página do produto.",
    relatedSlugs: [
      "brindes-com-logotipo",
      "presentes-corporativos",
      "brindes-ecologicos",
    ],
  },
  {
    slug: "brindes-com-logotipo",
    group: "commercial",
    title: "Brindes com logótipo para empresas",
    h1: "Brindes personalizados com logótipo",
    description:
      "Encontre brindes personalizáveis com logótipo e conheça os critérios para escolher produto, área e técnica de personalização.",
    eyebrow: "Soluções · Personalização",
    intro:
      "Colocar um logótipo num produto exige mais do que escolher uma imagem. O resultado depende do material, da área disponível, da localização e da técnica compatível com cada referência.",
    sections: [
      {
        title: "A técnica depende do produto",
        text: "Serigrafia, tampografia, gravação laser, transfer e outras técnicas têm aplicações diferentes. A disponibilidade deve ser confirmada na configuração específica de cada artigo.",
      },
      {
        title: "Legibilidade e área de personalização",
        text: "Um logótipo com muitos elementos pode exigir uma área maior ou uma técnica diferente. Considere tamanho, contraste e número de cores antes de fechar a seleção.",
      },
      {
        title: "Use o produto como suporte da marca",
        text: "A personalização deve reforçar a identificação sem comprometer a utilidade. Em muitos casos, uma aplicação mais discreta e bem posicionada cria um resultado mais consistente.",
      },
    ],
    highlights: [
      "Produtos com opções de personalização",
      "Diferentes áreas e localizações de impressão",
      "Técnicas adequadas ao material",
      "Configuração validada por referência",
    ],
    productQueries: ["caneta", "garrafa", "caderno", "saco", "polo", "mochila"],
    productFilter: { requireCustomizable: true },
    selectionNote:
      "Os produtos apresentados são personalizáveis e relacionados com categorias comuns de merchandising. A técnica e a área disponíveis variam por referência e devem ser confirmadas no configurador do produto.",
    relatedSlugs: [
      "brindes-para-empresas",
      "brindes-premium",
      "brindes-tecnologicos",
    ],
  },
  {
    slug: "brindes-ecologicos",
    group: "commercial",
    title: "Brindes ecológicos e sustentáveis personalizados",
    h1: "Brindes ecológicos e sustentáveis para empresas",
    description:
      "Explore brindes personalizados associados a materiais reciclados, rPET, bambu, cortiça, algodão reciclado e outras opções com informação ambiental.",
    eyebrow: "Soluções · Sustentabilidade",
    intro:
      "Uma escolha ambientalmente mais informada deve partir de dados concretos sobre materiais, composição, certificações e utilização. Esta página ajuda a descobrir referências relacionadas com materiais e atributos de sustentabilidade no catálogo.",
    sections: [
      {
        title: "Compare materiais e composição",
        text: "rPET, materiais reciclados, bambu, cortiça e algodão reciclado representam características diferentes. Leia a informação específica de cada produto antes de comunicar qualquer benefício ambiental.",
      },
      {
        title: "Procure dados verificáveis",
        text: "Quando disponíveis, certificações e campos ambientais ajudam a comparar produtos de forma mais rigorosa. Nem todas as referências têm o mesmo nível de informação documentada.",
      },
      {
        title: "Sustentabilidade também é utilização",
        text: "Durabilidade, reutilização e adequação ao destinatário devem fazer parte da decisão. Um produto útil e usado repetidamente pode ser mais coerente com a intenção da campanha.",
      },
    ],
    highlights: [
      "Materiais reciclados e rPET",
      "Bambu, cortiça e fibras alternativas",
      "Informação ambiental quando disponível",
      "Comunicação baseada em dados do produto",
    ],
    productQueries: ["reciclado", "rpet", "bambu", "cortiça", "algodão reciclado", "fsc"],
    productFilter: { requireCustomizable: true },
    selectionNote:
      "A seleção é baseada em termos presentes no catálogo e não constitui, por si só, uma certificação de sustentabilidade. Confirme materiais, composição e eventuais certificações na página de cada produto.",
    relatedSlugs: [
      "brindes-para-empresas",
      "brindes-premium",
      "presentes-corporativos",
    ],
  },
  {
    slug: "brindes-tecnologicos",
    group: "commercial",
    title: "Brindes tecnológicos personalizados",
    h1: "Brindes tecnológicos personalizados para empresas",
    description:
      "Descubra acessórios tecnológicos personalizáveis para empresas, eventos, equipas, clientes e campanhas de marca.",
    eyebrow: "Soluções · Tecnologia",
    intro:
      "Os brindes tecnológicos podem combinar utilidade, valor percebido e utilização recorrente. A seleção deve considerar compatibilidade, contexto de uso, quantidade e nível de investimento.",
    sections: [
      {
        title: "Utilidade antes da novidade",
        text: "Powerbanks, carregadores, cabos, suportes e outros acessórios funcionam melhor quando resolvem uma necessidade real do destinatário e não apenas quando parecem inovadores.",
      },
      {
        title: "Confirme especificações",
        text: "Capacidade, conectividade, compatibilidade e materiais podem variar entre referências. Leia os dados técnicos antes de comparar apenas pelo preço ou aspeto.",
      },
      {
        title: "Adequar ao público",
        text: "Equipas móveis, participantes de eventos e clientes podem valorizar soluções tecnológicas diferentes. O contexto ajuda a definir o nível de investimento e a tipologia de produto.",
      },
    ],
    highlights: [
      "Acessórios para trabalho e mobilidade",
      "Powerbanks e carregamento",
      "Produtos para eventos e equipas",
      "Personalização conforme referência",
    ],
    productQueries: ["powerbank", "carregador", "cabo", "usb", "wireless", "suporte"],
    productFilter: { requireCustomizable: true },
    selectionNote:
      "A seleção usa termos tecnológicos presentes no catálogo ativo. Verifique especificações, compatibilidade, stock e personalização na ficha individual do produto.",
    relatedSlugs: [
      "brindes-para-empresas",
      "brindes-premium",
      "brindes-com-logotipo",
    ],
  },
  {
    slug: "brindes-premium",
    group: "commercial",
    title: "Brindes premium personalizados para empresas",
    h1: "Brindes premium e presentes empresariais personalizados",
    description:
      "Explore ideias de brindes premium para clientes, parceiros, equipas e momentos em que a qualidade percebida tem maior importância.",
    eyebrow: "Soluções · Premium",
    intro:
      "Um brinde premium não é definido apenas pelo preço. Materiais, acabamento, apresentação, utilidade e adequação ao destinatário determinam a perceção de valor da oferta.",
    sections: [
      {
        title: "Qualidade percebida e contexto",
        text: "Uma oferta para um cliente estratégico pode justificar critérios diferentes de uma ação de grande escala. Defina primeiro a relação, o momento e a experiência que pretende criar.",
      },
      {
        title: "Menos artigos, mais coerência",
        text: "Em contextos premium, uma seleção mais curta e consistente pode ter maior impacto do que um conjunto extenso sem uma lógica clara de utilização.",
      },
      {
        title: "Personalização proporcional",
        text: "A aplicação da marca deve respeitar o produto. Em artigos de maior valor percebido, uma personalização discreta pode preservar melhor o acabamento e a utilização.",
      },
    ],
    highlights: [
      "Clientes e parceiros estratégicos",
      "Reconhecimento e ocasiões especiais",
      "Materiais e acabamento como critérios",
      "Personalização ajustada ao produto",
    ],
    productQueries: ["conjunto", "executivo", "premium", "mochila", "garrafa", "caneta"],
    productFilter: { requireCustomizable: true },
    selectionNote:
      "A noção de premium é editorial e depende do contexto. A seleção usa termos e categorias do catálogo; confirme materiais, acabamento, preço e configuração final antes de decidir.",
    relatedSlugs: [
      "presentes-corporativos",
      "brindes-para-clientes",
      "brindes-com-logotipo",
    ],
  },
  {
    slug: "presentes-corporativos",
    group: "commercial",
    title: "Presentes corporativos personalizados",
    h1: "Presentes corporativos para clientes, parceiros e equipas",
    description:
      "Ideias de presentes corporativos personalizados para agradecimento, fidelização, reconhecimento e momentos especiais.",
    eyebrow: "Soluções · Presentes corporativos",
    intro:
      "Um presente corporativo deve traduzir o valor da relação e ser adequado a quem o recebe. A utilidade, apresentação, nível de investimento e personalização devem funcionar em conjunto.",
    sections: [
      {
        title: "Defina o motivo da oferta",
        text: "Agradecimento, fidelização, celebração, reconhecimento e relacionamento comercial têm objetivos diferentes. O motivo ajuda a definir o tom e o nível de investimento.",
      },
      {
        title: "Segmentar destinatários",
        text: "Nem todos os clientes ou parceiros precisam de receber a mesma solução. É possível criar níveis de oferta mantendo uma identidade comum da marca.",
      },
      {
        title: "Planeie apresentação e prazo",
        text: "A embalagem, a personalização e a data de entrega fazem parte da experiência. Valide disponibilidade e configuração antes de fechar a campanha.",
      },
    ],
    highlights: [
      "Agradecimento e fidelização",
      "Clientes e parceiros",
      "Reconhecimento de equipas",
      "Ofertas standard e premium",
    ],
    productQueries: ["conjunto", "garrafa", "caneta", "caderno", "mochila", "caneca"],
    productFilter: { requireCustomizable: true },
    selectionNote:
      "Os produtos apresentados são sugestões do catálogo ativo relacionadas com ofertas corporativas. Ajuste a escolha ao destinatário, quantidade, orçamento e prazo efetivo.",
    relatedSlugs: [
      "brindes-premium",
      "brindes-para-clientes",
      "brindes-para-empresas",
    ],
  },
  {
    slug: "brindes-personalizados-ate-5-euros",
    group: "budget",
    title: "Brindes personalizados até 5 euros",
    h1: "Brindes personalizados com preço base até 5 € por unidade",
    description:
      "Explore produtos com pelo menos um escalão de preço base registado até 5 € por unidade e confirme a configuração final para a quantidade necessária.",
    eyebrow: "Soluções · Orçamento até 5 €",
    intro:
      "Esta seleção ajuda a reduzir o catálogo a produtos que têm pelo menos um escalão de preço base registado até 5 € por unidade. O valor final pode variar com quantidade, variante, personalização e configuração da encomenda.",
    sections: [
      {
        title: "Preço base não é preço final",
        text: "O limite desta página considera preços de produto registados no catálogo. Personalização e outros elementos da configuração podem alterar o valor final por unidade.",
      },
      {
        title: "A quantidade influencia o escalão",
        text: "Um produto pode entrar nesta seleção apenas a partir de determinada quantidade. Confirme sempre o escalão correspondente ao número de unidades que pretende comprar.",
      },
      {
        title: "Use o orçamento como primeiro filtro",
        text: "Depois de reduzir as opções pelo preço base, compare utilidade, stock, material, personalização e prazo para chegar a uma seleção mais consistente.",
      },
    ],
    highlights: [
      "Pelo menos um escalão base até 5 €/un.",
      "Preço final depende da configuração",
      "Stock disponível apresentado primeiro",
      "Produtos personalizáveis priorizados",
    ],
    productQueries: ["caneta", "lanyard", "saco", "bloco", "caderno", "chaveiro"],
    productFilter: { maxUnitPrice: 5, requireCustomizable: true },
    selectionNote:
      "Critério desta página: pelo menos um escalão de preço base registado até 5 € por unidade. O preço final depende da quantidade, variante, personalização e configuração; confirme-o sempre na página do produto.",
    relatedSlugs: [
      "brindes-personalizados-ate-10-euros",
      "brindes-para-100-unidades",
      "brindes-para-500-unidades",
    ],
  },
  {
    slug: "brindes-personalizados-ate-10-euros",
    group: "budget",
    title: "Brindes personalizados até 10 euros",
    h1: "Brindes personalizados com preço base até 10 € por unidade",
    description:
      "Explore produtos com pelo menos um escalão de preço base registado até 10 € por unidade e compare opções para empresas e eventos.",
    eyebrow: "Soluções · Orçamento até 10 €",
    intro:
      "Esta página reúne candidatos cujo catálogo tem pelo menos um escalão de preço base até 10 € por unidade. É uma forma de começar a seleção por orçamento sem confundir preço de produto com custo final personalizado.",
    sections: [
      {
        title: "Crie uma shortlist por orçamento",
        text: "O limite de preço ajuda a eliminar opções incompatíveis com o investimento previsto. Depois, compare produto, utilização, material e qualidade percebida.",
      },
      {
        title: "Valide o escalão para a quantidade real",
        text: "Os preços podem variar por quantidade. Um artigo que cumpre este limite num escalão elevado pode ter um preço diferente para uma encomenda mais pequena.",
      },
      {
        title: "Reserve margem para personalização",
        text: "Planeie o orçamento considerando a configuração final e não apenas o produto. Use o Smart Merch quando quiser cruzar quantidade, teto de investimento e prazo.",
      },
    ],
    highlights: [
      "Pelo menos um escalão base até 10 €/un.",
      "Faixa útil para kits e ações empresariais",
      "Preço final confirmado na configuração",
      "Stock disponível apresentado primeiro",
    ],
    productQueries: ["garrafa", "caderno", "saco", "caneca", "mochila", "polo"],
    productFilter: { maxUnitPrice: 10, requireCustomizable: true },
    selectionNote:
      "Critério desta página: pelo menos um escalão de preço base registado até 10 € por unidade. O valor final pode ser superior ou inferior consoante quantidade, variante e personalização.",
    relatedSlugs: [
      "brindes-personalizados-ate-5-euros",
      "brindes-personalizados-ate-20-euros",
      "brindes-para-250-unidades",
    ],
  },
  {
    slug: "brindes-personalizados-ate-20-euros",
    group: "budget",
    title: "Brindes personalizados até 20 euros",
    h1: "Brindes personalizados com preço base até 20 € por unidade",
    description:
      "Explore referências com pelo menos um escalão de preço base até 20 € por unidade para ações empresariais, kits e presentes corporativos.",
    eyebrow: "Soluções · Orçamento até 20 €",
    intro:
      "Uma faixa de preço base até 20 € abre espaço a categorias com maior valor percebido e a combinações mais robustas. A seleção continua a exigir validação da quantidade e da personalização para chegar ao custo final.",
    sections: [
      {
        title: "Mais margem para valor percebido",
        text: "Esta faixa pode incluir produtos com materiais, capacidade ou apresentação diferentes das opções de menor preço. Compare o que é relevante para o destinatário.",
      },
      {
        title: "Não confunda teto unitário com orçamento total",
        text: "Multiplique o custo previsto pelo número de destinatários e reserve margem para personalização, logística e eventuais elementos complementares do kit.",
      },
      {
        title: "Compare alternativas próximas",
        text: "Depois de encontrar produtos dentro do limite, compare duas ou três opções com funções semelhantes para perceber onde o investimento adicional cria valor real.",
      },
    ],
    highlights: [
      "Pelo menos um escalão base até 20 €/un.",
      "Maior variedade de categorias",
      "Adequado a kits e presentes empresariais",
      "Configuração final validada antes da compra",
    ],
    productQueries: ["mochila", "powerbank", "garrafa", "conjunto", "polo", "coluna"],
    productFilter: { maxUnitPrice: 20, requireCustomizable: true },
    selectionNote:
      "Critério desta página: pelo menos um escalão de preço base registado até 20 € por unidade. O preço apresentado na ficha e o custo final dependem da quantidade e da configuração escolhida.",
    relatedSlugs: [
      "brindes-personalizados-ate-10-euros",
      "brindes-premium",
      "presentes-corporativos",
    ],
  },
  {
    slug: "brindes-para-50-unidades",
    group: "quantity",
    title: "Brindes personalizados para 50 unidades",
    h1: "Brindes personalizados para encomendas de 50 unidades",
    description:
      "Explore produtos cujo mínimo de encomenda registado não ultrapassa 50 unidades e confirme stock, preço e personalização para a sua configuração.",
    eyebrow: "Soluções · 50 unidades",
    intro:
      "Para uma encomenda de 50 unidades, o primeiro passo é eliminar produtos cujo mínimo seja superior à quantidade pretendida. Esta página faz esse filtro inicial e mantém a validação de stock, preço e personalização na ficha do produto.",
    sections: [
      {
        title: "Mínimo compatível com 50 unidades",
        text: "A seleção considera o mínimo de encomenda registado no catálogo. Isto não garante stock suficiente nem um preço específico para 50 unidades.",
      },
      {
        title: "Pequenas séries exigem atenção ao custo unitário",
        text: "Em quantidades mais baixas, o escalão de preço e a personalização podem ter maior peso por unidade. Compare a solução final e não apenas o preço base.",
      },
      {
        title: "Escolha artigos adequados ao destinatário",
        text: "Com uma audiência mais reduzida, pode fazer sentido privilegiar relevância e qualidade percebida em vez de maximizar apenas o número de artigos.",
      },
    ],
    highlights: [
      "Mínimo registado até 50 unidades",
      "Stock disponível apresentado primeiro",
      "Preço confirmado para a quantidade real",
      "Personalização verificada por produto",
    ],
    productQueries: ["caneta", "caderno", "garrafa", "saco", "mochila", "caneca"],
    productFilter: { targetQuantity: 50, requireCustomizable: true },
    selectionNote:
      "Critério desta página: mínimo de encomenda registado igual ou inferior a 50 unidades. Não garante stock para 50 unidades nem um preço fixo; confirme ambos na ficha do produto.",
    relatedSlugs: [
      "brindes-para-100-unidades",
      "brindes-personalizados-ate-20-euros",
      "brindes-premium",
    ],
  },
  {
    slug: "brindes-para-100-unidades",
    group: "quantity",
    title: "Brindes personalizados para 100 unidades",
    h1: "Brindes personalizados para encomendas de 100 unidades",
    description:
      "Encontre produtos com mínimo de encomenda até 100 unidades e compare opções de merchandising para empresas, equipas e eventos.",
    eyebrow: "Soluções · 100 unidades",
    intro:
      "A quantidade de 100 unidades é suficiente para comparar várias famílias de produto, mas continua a ser importante verificar o escalão de preço, stock e configuração específica antes de decidir.",
    sections: [
      {
        title: "Comece pelo mínimo de encomenda",
        text: "Esta página exclui referências cujo mínimo conhecido seja superior a 100 unidades. É um filtro de compatibilidade inicial, não uma garantia de disponibilidade.",
      },
      {
        title: "Compare o preço no escalão correto",
        text: "Os produtos podem ter preços diferentes por quantidade. Confirme qual o escalão aplicável a 100 unidades e o impacto da personalização escolhida.",
      },
      {
        title: "Ajuste a seleção ao objetivo",
        text: "Uma ação para clientes, uma equipa interna ou um pequeno evento podem justificar critérios diferentes apesar de terem a mesma quantidade.",
      },
    ],
    highlights: [
      "Mínimo registado até 100 unidades",
      "Adequado a pequenas e médias ações",
      "Stock disponível apresentado primeiro",
      "Preço e personalização confirmados na ficha",
    ],
    productQueries: ["caneta", "caderno", "garrafa", "saco", "lanyard", "t-shirt"],
    productFilter: { targetQuantity: 100, requireCustomizable: true },
    selectionNote:
      "Critério desta página: mínimo de encomenda registado igual ou inferior a 100 unidades. A disponibilidade efetiva e o preço para 100 unidades devem ser confirmados no produto.",
    relatedSlugs: [
      "brindes-para-50-unidades",
      "brindes-para-250-unidades",
      "brindes-personalizados-ate-10-euros",
    ],
  },
  {
    slug: "brindes-para-250-unidades",
    group: "quantity",
    title: "Brindes personalizados para 250 unidades",
    h1: "Brindes personalizados para encomendas de 250 unidades",
    description:
      "Explore produtos com mínimo de encomenda até 250 unidades para campanhas, eventos e ações empresariais.",
    eyebrow: "Soluções · 250 unidades",
    intro:
      "Para 250 unidades, a comparação entre escalões de preço torna-se particularmente relevante. Esta página filtra referências cujo mínimo não ultrapassa a quantidade pretendida e apresenta primeiro as que têm stock registado.",
    sections: [
      {
        title: "Filtrar antes de comparar",
        text: "Eliminar produtos com mínimos incompatíveis reduz ruído. Depois, compare preço, material, personalização e adequação à ação.",
      },
      {
        title: "Avalie o custo total",
        text: "Uma pequena diferença por unidade pode ter impacto relevante quando multiplicada por 250. Compare o custo final da configuração, não apenas o preço de entrada.",
      },
      {
        title: "Planeie margem e distribuição",
        text: "Se a quantidade corresponde a participantes ou destinatários, defina conscientemente qualquer margem adicional e como será feita a distribuição.",
      },
    ],
    highlights: [
      "Mínimo registado até 250 unidades",
      "Comparação de escalões de preço",
      "Produtos com stock apresentados primeiro",
      "Adequado a eventos e campanhas empresariais",
    ],
    productQueries: ["caneta", "saco", "caderno", "garrafa", "lanyard", "caneca"],
    productFilter: { targetQuantity: 250, requireCustomizable: true },
    selectionNote:
      "Critério desta página: mínimo de encomenda registado igual ou inferior a 250 unidades. Confirme stock suficiente, escalão de preço e configuração final antes da compra.",
    relatedSlugs: [
      "brindes-para-100-unidades",
      "brindes-para-500-unidades",
      "brindes-personalizados-ate-10-euros",
    ],
  },
  {
    slug: "brindes-para-500-unidades",
    group: "quantity",
    title: "Brindes personalizados para 500 unidades",
    h1: "Brindes personalizados para encomendas de 500 unidades",
    description:
      "Encontre produtos com mínimo de encomenda até 500 unidades e planeie merchandising para eventos, campanhas e ações de maior escala.",
    eyebrow: "Soluções · 500 unidades",
    intro:
      "Em encomendas de 500 unidades, preço unitário, stock e logística ganham peso. Esta seleção começa por produtos cujo mínimo registado é compatível com a quantidade e mantém a validação final na ficha do artigo.",
    sections: [
      {
        title: "O preço unitário ganha escala",
        text: "Diferenças pequenas por unidade podem representar valores significativos no total. Compare sempre o escalão correto e o custo final personalizado.",
      },
      {
        title: "Stock suficiente é um critério central",
        text: "A página ordena primeiro referências com stock registado, mas deve confirmar se a quantidade disponível cobre a encomenda e o prazo necessário.",
      },
      {
        title: "Evite escolher apenas pelo menor preço",
        text: "Utilidade, distribuição, material e coerência com a marca continuam a ser importantes numa ação de maior volume.",
      },
    ],
    highlights: [
      "Mínimo registado até 500 unidades",
      "Impacto do preço unitário no total",
      "Stock disponível apresentado primeiro",
      "Adequado a ações de maior escala",
    ],
    productQueries: ["caneta", "lanyard", "saco", "bloco", "garrafa", "chaveiro"],
    productFilter: { targetQuantity: 500, requireCustomizable: true },
    selectionNote:
      "Critério desta página: mínimo de encomenda registado igual ou inferior a 500 unidades. O stock total necessário e o preço para esse volume devem ser confirmados na configuração.",
    relatedSlugs: [
      "brindes-para-250-unidades",
      "brindes-para-1000-unidades",
      "brindes-personalizados-ate-5-euros",
    ],
  },
  {
    slug: "brindes-para-1000-unidades",
    group: "quantity",
    title: "Brindes personalizados para 1000 unidades",
    h1: "Brindes personalizados para encomendas de 1000 unidades",
    description:
      "Explore produtos com mínimo de encomenda até 1000 unidades para grandes eventos, campanhas e ações promocionais.",
    eyebrow: "Soluções · 1000 unidades",
    intro:
      "Uma encomenda de 1000 unidades exige uma leitura rigorosa de preço, disponibilidade e prazo. Esta página filtra pelo mínimo de encomenda registado e apresenta candidatos para uma comparação inicial.",
    sections: [
      {
        title: "Trabalhe com o custo total da ação",
        text: "Em volumes elevados, cada variação de preço por unidade tem impacto. Compare o escalão aplicável e inclua personalização e configuração no orçamento.",
      },
      {
        title: "Confirme disponibilidade e reposição",
        text: "Ter algum stock não significa ter 1000 unidades disponíveis. Valide stock atual, eventuais reposições e prazo antes de assumir a viabilidade da referência.",
      },
      {
        title: "Planeie a distribuição",
        text: "Grandes quantidades devem estar ligadas a uma estratégia clara de distribuição para evitar excedentes e melhorar a relevância do merchandising.",
      },
    ],
    highlights: [
      "Mínimo registado até 1000 unidades",
      "Planeamento para grande escala",
      "Stock e prazo validados antes da decisão",
      "Comparação do custo total da configuração",
    ],
    productQueries: ["caneta", "lanyard", "saco", "chaveiro", "bloco", "garrafa"],
    productFilter: { targetQuantity: 1000, requireCustomizable: true },
    selectionNote:
      "Critério desta página: mínimo de encomenda registado igual ou inferior a 1000 unidades. A seleção não garante existência de 1000 unidades em stock; confirme disponibilidade e prazo na ficha do produto.",
    relatedSlugs: [
      "brindes-para-500-unidades",
      "brindes-personalizados-ate-5-euros",
      "brindes-para-feiras",
    ],
  },
  {
    slug: "brindes-para-clientes",
    group: "occasion",
    title: "Brindes personalizados para clientes",
    h1: "Brindes personalizados para clientes e fidelização",
    description:
      "Explore ideias de brindes para clientes, agradecimento, fidelização e relacionamento comercial.",
    eyebrow: "Soluções · Clientes",
    intro:
      "Um brinde para clientes deve reforçar a relação sem parecer indiferenciado. Segmentação, utilidade, qualidade percebida e momento de entrega ajudam a transformar a oferta numa experiência mais relevante.",
    sections: [
      {
        title: "Segmentar antes de escolher",
        text: "Clientes recorrentes, novos clientes e contas estratégicas podem justificar soluções diferentes. A segmentação ajuda a distribuir o orçamento de forma mais coerente.",
      },
      {
        title: "Escolha algo que prolongue a relação",
        text: "Produtos úteis e adequados ao quotidiano podem manter a marca presente depois do momento de oferta sem depender de uma exposição excessiva do logótipo.",
      },
      {
        title: "Associe o brinde a um momento",
        text: "Agradecimento, renovação, aniversário, evento ou conquista comercial dão contexto à oferta e ajudam a escolher produto, mensagem e nível de investimento.",
      },
    ],
    highlights: [
      "Fidelização e agradecimento",
      "Clientes estratégicos e recorrentes",
      "Ofertas por segmento",
      "Personalização adequada ao relacionamento",
    ],
    productQueries: ["garrafa", "caneta", "caderno", "conjunto", "mochila", "caneca"],
    productFilter: { requireCustomizable: true },
    selectionNote:
      "A seleção apresenta produtos personalizáveis relacionados com ofertas a clientes. Ajuste a escolha ao perfil do destinatário, quantidade e orçamento da relação comercial.",
    relatedSlugs: [
      "presentes-corporativos",
      "brindes-premium",
      "brindes-para-empresas",
    ],
  },
  {
    slug: "brindes-para-feiras",
    group: "occasion",
    title: "Brindes personalizados para feiras",
    h1: "Brindes personalizados para feiras e exposições",
    description:
      "Encontre merchandising para feiras, stands, exposições e ações de captação com produtos fáceis de distribuir e personalizar.",
    eyebrow: "Soluções · Feiras",
    intro:
      "Numa feira, o merchandising compete por atenção e tem de funcionar num contexto de grande circulação. Distribuição, volume, transporte, utilidade e custo unitário são critérios centrais.",
    sections: [
      {
        title: "Diferencie captação e relacionamento",
        text: "Nem todos os visitantes precisam de receber o mesmo artigo. Pode combinar uma opção de grande distribuição com produtos diferentes para leads qualificados, parceiros ou convidados.",
      },
      {
        title: "Pense na logística do stand",
        text: "Peso, volume, armazenamento e facilidade de entrega são importantes quando centenas de pessoas passam pelo espaço durante o evento.",
      },
      {
        title: "Ligue o produto à ação comercial",
        text: "O brinde pode acompanhar um QR code, demonstração, reunião ou recolha de contacto. O produto deve fazer parte da experiência e não ser apenas um objeto isolado.",
      },
    ],
    highlights: [
      "Feiras e exposições",
      "Distribuição em stand",
      "Captação e qualificação de contactos",
      "Produtos compactos e funcionais",
    ],
    productQueries: ["lanyard", "saco", "caneta", "bloco", "garrafa", "chaveiro"],
    productFilter: { requireCustomizable: true },
    selectionNote:
      "A seleção privilegia categorias frequentemente adequadas a feiras. Confirme quantidade, stock, personalização e logística da ação antes da encomenda.",
    relatedSlugs: [
      "brindes-para-500-unidades",
      "brindes-para-1000-unidades",
      "brindes-para-empresas",
    ],
  },
  {
    slug: "brindes-para-team-building",
    group: "occasion",
    title: "Brindes para team building e eventos internos",
    h1: "Brindes personalizados para team building e equipas",
    description:
      "Explore merchandising personalizado para team building, encontros de equipa, eventos internos e cultura de empresa.",
    eyebrow: "Soluções · Team building",
    intro:
      "Em team building, o merchandising pode reforçar identidade, facilitar a atividade e criar uma memória comum. A seleção deve estar ligada ao formato do encontro e ao que as pessoas irão realmente usar.",
    sections: [
      {
        title: "Ligue o produto à atividade",
        text: "Têxteis, garrafas, mochilas, sacos ou acessórios podem ter funções diferentes consoante o evento seja outdoor, formação, encontro interno ou celebração.",
      },
      {
        title: "Crie unidade sem perder utilidade",
        text: "A identidade visual pode ajudar a criar coesão, mas o produto deve continuar a ser confortável e útil depois da atividade.",
      },
      {
        title: "Prepare tamanhos e variantes",
        text: "Quando existem têxteis ou produtos com diferentes opções, recolha necessidades com antecedência e confirme disponibilidade antes de fechar a encomenda.",
      },
    ],
    highlights: [
      "Eventos internos e encontros de equipa",
      "Atividades outdoor e formação",
      "Têxteis, garrafas e acessórios",
      "Identidade de equipa com utilização real",
    ],
    productQueries: ["t-shirt", "polo", "garrafa", "mochila", "saco", "boné"],
    productFilter: { requireCustomizable: true },
    selectionNote:
      "A seleção usa categorias relacionadas com eventos de equipa. Valide tamanhos, variantes, stock e personalização antes de planear a distribuição.",
    relatedSlugs: [
      "brindes-para-empresas",
      "brindes-para-100-unidades",
      "brindes-ecologicos",
    ],
  },
  {
    slug: "brindes-para-lancamento-produto",
    group: "occasion",
    title: "Brindes para lançamento de produto",
    h1: "Merchandising personalizado para lançamentos de produto",
    description:
      "Ideias de merchandising para lançamentos, ativações e experiências de marca com produtos personalizáveis e diferentes níveis de distribuição.",
    eyebrow: "Soluções · Lançamentos",
    intro:
      "Num lançamento, o merchandising pode materializar a identidade da campanha e prolongar a experiência depois do evento. A seleção deve estar ligada à mensagem, ao público e ao papel que o produto terá na ativação.",
    sections: [
      {
        title: "Transforme o conceito em critérios de produto",
        text: "Cores, materiais, tecnologia, sustentabilidade ou mobilidade podem ser usados como filtros quando estão realmente ligados à proposta do lançamento.",
      },
      {
        title: "Crie níveis de distribuição",
        text: "Participantes, imprensa, influenciadores, clientes e equipa interna podem receber soluções diferentes sem perder a coerência visual da campanha.",
      },
      {
        title: "Planeie a produção a partir da data de lançamento",
        text: "Feche produto, quantidades, arte final e personalização com antecedência suficiente para não transformar o merchandising num risco para a ação.",
      },
    ],
    highlights: [
      "Lançamentos e ativações de marca",
      "Imprensa, convidados e clientes",
      "Kits temáticos e produtos hero",
      "Planeamento orientado pela data crítica",
    ],
    productQueries: ["garrafa", "saco", "caderno", "t-shirt", "powerbank", "mochila"],
    productFilter: { requireCustomizable: true },
    selectionNote:
      "Os produtos apresentados são sugestões relacionadas com ativações e lançamentos. A seleção final deve ser validada face ao conceito, público, quantidade e prazo da campanha.",
    relatedSlugs: [
      "brindes-para-feiras",
      "brindes-premium",
      "brindes-tecnologicos",
    ],
  },
];

export function getCommercialPages(locale: SiteLocale = "pt"): CommercialLandingConfig[] {
  return COMMERCIAL_PAGES.map((page) => localizeCommercialConfig(page, locale));
}

export function getCommercialPage(slug: string, locale: SiteLocale = "pt"): CommercialLandingConfig | null {
  const page = COMMERCIAL_PAGES.find((item) => item.slug === slug);
  return page ? localizeCommercialConfig(page, locale) : null;
}

export function getRelatedCommercialPages(
  config: CommercialLandingConfig,
  locale: SiteLocale = "pt",
): CommercialLandingConfig[] {
  return config.relatedSlugs
    .map((slug) => getCommercialPage(slug, locale))
    .filter((page): page is CommercialLandingConfig => Boolean(page));
}

export function getCommercialPagesByGroup(
  group: CommercialLandingGroup,
  locale: SiteLocale = "pt",
): CommercialLandingConfig[] {
  return getCommercialPages(locale).filter((page) => page.group === group);
}

export type CommercialFaq = {
  question: string;
  answer: string;
};

export function getCommercialPageFaq(
  config: CommercialLandingConfig,
  locale: SiteLocale = "pt",
): CommercialFaq[] {
  if (locale !== "pt") {
    const en = locale === "en";
    return en ? [
      { question: "How are the products selected?", answer: "The page searches the active catalogue using terms and commercial filters related to this need." },
      { question: "Does this selection replace the product page?", answer: "No. The product page remains the reference for stock, minimum quantity, price, materials, variants and customisation." },
      { question: "Can I combine budget and quantity criteria?", answer: "Yes. Use Smart Merch or the budget and quantity solution pages to narrow down the options." },
    ] : [
      { question: "Comment les produits sont-ils sélectionnés ?", answer: "La page recherche dans le catalogue actif à l’aide de termes et de filtres commerciaux liés à ce besoin." },
      { question: "Cette sélection remplace-t-elle la page produit ?", answer: "Non. La page produit reste la référence pour le stock, la quantité minimale, le prix, les matériaux, les variantes et la personnalisation." },
      { question: "Puis-je combiner budget et quantité ?", answer: "Oui. Utilisez Smart Merch ou les pages par budget et quantité pour affiner les options." },
    ];
  }
  if (config.group === "budget") {
    return [
      {
        question: "O valor indicado inclui a personalização?",
        answer:
          "Não necessariamente. Estas páginas usam preços base registados no catálogo para criar um primeiro filtro. O valor final depende da quantidade, variante e configuração de personalização escolhidas.",
      },
      {
        question: "Um produto apresentado nesta página fica sempre abaixo do orçamento?",
        answer:
          "Não. Significa apenas que existe pelo menos um escalão de preço base compatível com o teto usado no filtro. A configuração final pode alterar o valor.",
      },
      {
        question: "O preço unitário pode mudar com a quantidade?",
        answer:
          "Sim. Os produtos podem ter diferentes escalões de preço e a quantidade escolhida deve ser confirmada na ficha do produto.",
      },
    ];
  }

  if (config.group === "quantity") {
    return [
      {
        question: "Esta página garante que existe stock para a quantidade indicada?",
        answer:
          "Não. O filtro verifica se o mínimo de encomenda registado é compatível com a quantidade, mas o stock disponível deve ser confirmado no produto.",
      },
      {
        question: "O que significa mínimo de encomenda compatível?",
        answer:
          "Significa que o mínimo registado para a referência é igual ou inferior à quantidade usada no filtro desta página.",
      },
      {
        question: "Todos os produtos podem ser personalizados na quantidade escolhida?",
        answer:
          "A possibilidade e configuração da personalização dependem da referência, da técnica e das regras aplicáveis ao produto.",
      },
    ];
  }

  if (config.group === "occasion") {
    return [
      {
        question: "Os produtos apresentados são obrigatórios para esta ocasião?",
        answer:
          "Não. São sugestões obtidas a partir de categorias relacionadas com o contexto. A seleção final deve ser adaptada ao público, objetivo, orçamento, quantidade e prazo.",
      },
      {
        question: "Como devo confirmar o prazo?",
        answer:
          "Valide stock, configuração, personalização e expedição para a referência escolhida, sobretudo quando existe uma data fixa para a ação.",
      },
      {
        question: "Posso combinar vários produtos num kit?",
        answer:
          "Sim, desde que a combinação tenha uma função clara e seja planeada considerando orçamento, disponibilidade e logística.",
      },
    ];
  }

  return [
    {
      question: "Como são escolhidos os produtos apresentados?",
      answer:
        "A página pesquisa o catálogo ativo através de termos relacionados com esta necessidade e aplica os filtros comerciais definidos para a seleção.",
    },
    {
      question: "A seleção substitui a ficha individual do produto?",
      answer:
        "Não. A ficha individual continua a ser a referência para confirmar stock, quantidade mínima, preço, materiais, variante e personalização.",
    },
    {
      question: "Posso cruzar esta necessidade com orçamento e quantidade?",
      answer:
        "Sim. Pode usar o Smart Merch ou as páginas de soluções por orçamento e quantidade para reduzir ainda mais as opções.",
    },
  ];
}
import type { SiteLocale } from "@/lib/i18n/config";
import { localizeCommercialConfig } from "@/lib/i18n/commercial-content";
