import { truncateSeoText } from "@/lib/seo/metadata";
import type { SiteLocale } from "@/lib/i18n/config";

export type CategorySeoContent = {
  title: string;
  description: string;
  intro: string;
  guideTitle: string;
  guideText: string;
};

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function buildCategorySeoContent(
  categoryName: string,
  locale: SiteLocale = "pt",
): CategorySeoContent {
  if (locale === "en") {
    return {
      title: `Customisable ${categoryName} products`,
      description: truncateSeoText(
        `Explore customisable ${categoryName} products for companies, campaigns, events and teams. Compare products, volume pricing, stock and customisation options.`,
      ),
      intro: `Explore ${categoryName} products for companies, campaigns, events, teams and clients. Compare materials, volume pricing, stock and the available customisation options.`,
      guideTitle: `How to choose ${categoryName} products`,
      guideText:
        "Start with the objective, audience, quantity and budget. Then compare materials, dimensions, stock and customisation techniques to select the right solution for its intended use.",
    };
  }

  if (locale === "fr") {
    return {
      title: `Produits ${categoryName} personnalisables`,
      description: truncateSeoText(
        `Découvrez des produits ${categoryName} personnalisables pour les entreprises, campagnes, événements et équipes. Comparez les produits, tarifs dégressifs, stocks et options de personnalisation.`,
      ),
      intro: `Découvrez des produits ${categoryName} pour les entreprises, campagnes, événements, équipes et clients. Comparez les matériaux, tarifs dégressifs, stocks et options de personnalisation disponibles.`,
      guideTitle: `Comment choisir des produits ${categoryName}`,
      guideText:
        "Commencez par définir l’objectif, le public, la quantité et le budget. Comparez ensuite les matériaux, dimensions, stocks et techniques de personnalisation pour choisir la solution adaptée.",
    };
  }

  const normalized = normalize(categoryName);
  const title = `Produtos de ${categoryName} personalizáveis`;

  if (/escrit|writing|canet|cadern|office/.test(normalized)) {
    return {
      title,
      description: truncateSeoText(
        `Explore ${categoryName} personalizáveis para empresas, eventos, congressos, welcome kits e ações promocionais. Compare produtos, preços, stock e opções de personalização.`,
      ),
      intro: `Explore artigos de ${categoryName} para utilização empresarial, eventos, equipas e ações promocionais. Consulte cada produto para comparar materiais, quantidades, stock, preços e opções de personalização disponíveis.`,
      guideTitle: `Como escolher artigos de ${categoryName}`,
      guideText:
        "Considere o contexto de utilização, a quantidade necessária, o orçamento por unidade e o tipo de personalização pretendido. Para ações com grande distribuição, a simplicidade e a utilidade tendem a ser especialmente importantes.",
    };
  }

  if (/tecnolog|technology|electron|power|usb/.test(normalized)) {
    return {
      title,
      description: truncateSeoText(
        `Descubra ${categoryName} personalizáveis para empresas, equipas, eventos e welcome kits. Compare stock, preços e técnicas de personalização no catálogo 360 Merchandising.`,
      ),
      intro: `Encontre soluções de ${categoryName} para equipas, clientes, eventos e kits empresariais. Antes de escolher, compare funcionalidade, compatibilidade, stock, quantidades e possibilidades de personalização.`,
      guideTitle: `O que avaliar em ${categoryName}`,
      guideText:
        "A utilidade real do produto deve ser o primeiro critério. Confirme características técnicas, compatibilidade, materiais e área de personalização antes de definir a solução final.",
    };
  }

  if (/textil|textile|vestuario|apparel|roupa/.test(normalized)) {
    return {
      title,
      description: truncateSeoText(
        `Explore ${categoryName} personalizáveis para equipas, eventos, marcas e employer branding. Consulte tamanhos, materiais, stock e opções de personalização.`,
      ),
      intro: `Descubra opções de ${categoryName} para equipas, eventos, employer branding e merchandising de marca. Consulte as variantes disponíveis e confirme materiais, tamanhos, stock e técnicas de personalização em cada produto.`,
      guideTitle: `Como selecionar ${categoryName}`,
      guideText:
        "Além do preço, considere conforto, utilização prevista, variedade de tamanhos, material e durabilidade. A técnica de personalização deve ser compatível com o tecido e com o resultado visual pretendido.",
    };
  }

  if (/bag|saco|mochil|mala/.test(normalized)) {
    return {
      title,
      description: truncateSeoText(
        `Explore ${categoryName} personalizáveis para eventos, welcome kits, congressos, equipas e clientes. Compare materiais, capacidades, preços e stock.`,
      ),
      intro: `Explore ${categoryName} para eventos, kits, equipas e ações de marca. Compare dimensões, materiais, capacidade, stock e opções de personalização para encontrar a solução adequada ao uso previsto.`,
      guideTitle: `Como escolher ${categoryName}`,
      guideText:
        "Pense primeiro no que será transportado, na frequência de utilização e no perfil de quem recebe. Material, dimensão, conforto e área disponível para personalização são critérios essenciais.",
    };
  }

  if (/drink|garraf|caneca|copo|bebid/.test(normalized)) {
    return {
      title,
      description: truncateSeoText(
        `Descubra ${categoryName} personalizáveis para empresas, colaboradores, eventos e gifts. Compare materiais, capacidades, preços, stock e personalização.`,
      ),
      intro: `Encontre ${categoryName} para equipas, eventos, clientes e ações promocionais. Compare materiais, capacidade, stock, preço por quantidade e técnicas de personalização disponíveis.`,
      guideTitle: `O que considerar antes de escolher`,
      guideText:
        "Capacidade, material, facilidade de utilização e contexto de transporte são fatores importantes. Em brindes de uso recorrente, a durabilidade e a adequação ao público têm um impacto direto na utilidade do produto.",
    };
  }

  return {
    title,
    description: truncateSeoText(
      `Explore ${categoryName} personalizáveis para empresas, campanhas, eventos, equipas e ações promocionais. Compare produtos, preços, stock e opções de personalização.`,
    ),
    intro: `Explore produtos de ${categoryName} para empresas, campanhas, eventos, equipas e clientes. Consulte cada referência para comparar materiais, preços por quantidade, stock e opções de personalização disponíveis.`,
    guideTitle: `Como escolher produtos de ${categoryName}`,
    guideText:
      "Defina primeiro o objetivo, o público, a quantidade e o orçamento. Depois compare materiais, dimensões, stock e técnicas de personalização para selecionar uma solução adequada ao contexto de utilização.",
  };
}

export function buildSubcategoryDescription(
  categoryName: string,
  subcategoryName: string,
  locale: SiteLocale = "pt",
): string {
  if (locale === "en") {
    return truncateSeoText(
      `Explore ${subcategoryName} in the ${categoryName} category. Compare customisable products, volume pricing, stock and customisation options for companies and events.`,
    );
  }

  if (locale === "fr") {
    return truncateSeoText(
      `Découvrez ${subcategoryName} dans la catégorie ${categoryName}. Comparez les produits personnalisables, tarifs dégressifs, stocks et options de personnalisation pour entreprises et événements.`,
    );
  }

  return truncateSeoText(
    `Explore ${subcategoryName} na categoria ${categoryName}. Compare produtos personalizáveis, preços por quantidade, stock e opções de personalização para empresas e eventos.`,
  );
}
