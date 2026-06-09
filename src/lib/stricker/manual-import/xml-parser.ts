import {
  type ManualImportPreview,
  type ParsedXmlPreviewNode,
} from "@/lib/stricker/manual-import/types";

function extractRootName(content: string): string | null {
  const match = content.match(/<([A-Za-z_][\w:.-]*)(\s|>|\/)/);

  return match?.[1] ?? null;
}

function extractRepeatedNodes(content: string): ParsedXmlPreviewNode[] {
  const nodeRegex =
    /<([A-Za-z_][\w:.-]*)([^>]*)>([\s\S]*?)<\/\1>/g;

  const nodes: ParsedXmlPreviewNode[] = [];
  let match: RegExpExecArray | null;

  while ((match = nodeRegex.exec(content)) !== null && nodes.length < 10) {
    const name = match[1];
    const rawAttributes = match[2] ?? "";
    const innerContent = match[3] ?? "";

    if (!name || name.includes("?")) {
      continue;
    }

    const attributes: Record<string, string> = {};
    const attributeRegex = /([A-Za-z_][\w:.-]*)="([^"]*)"/g;
    let attributeMatch: RegExpExecArray | null;

    while ((attributeMatch = attributeRegex.exec(rawAttributes)) !== null) {
      const attributeName = attributeMatch[1];
      const attributeValue = attributeMatch[2];

      if (attributeName) {
        attributes[attributeName] = attributeValue ?? "";
      }
    }

    const childMatches = innerContent.match(/<([A-Za-z_][\w:.-]*)(\s|>|\/)/g);
    const text = innerContent
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    nodes.push({
      name,
      attributes,
      text: text.length > 0 ? text.slice(0, 300) : null,
      childrenCount: childMatches?.length ?? 0,
    });
  }

  return nodes;
}

function countLikelyRecords(content: string, rootName: string | null): number {
  const candidateNames = [
    "Product",
    "Products",
    "ProductTree",
    "Optional",
    "Color",
    "Stock",
    "CustomizationOption",
    "CustomizationTable",
    "Type",
  ];

  for (const name of candidateNames) {
    const regex = new RegExp(`<${name}(\\s|>)`, "gi");
    const matches = content.match(regex);

    if (matches && matches.length > 1) {
      return matches.length;
    }
  }

  if (!rootName) {
    return 0;
  }

  const regex = new RegExp(`<${rootName}(\\s|>)`, "gi");
  const matches = content.match(regex);

  return Math.max(0, (matches?.length ?? 1) - 1);
}

export function parseXmlPreview(content: string): ManualImportPreview {
  const errors: string[] = [];

  const trimmed = content.trim();

  if (!trimmed.startsWith("<")) {
    return {
      recordsDetected: 0,
      previewPayload: {},
      errors: ["O ficheiro não parece ser XML válido."],
    };
  }

  const rootName = extractRootName(trimmed);
  const sampleNodes = extractRepeatedNodes(trimmed);
  const recordsDetected = countLikelyRecords(trimmed, rootName);

  if (!rootName) {
    errors.push("Não foi possível detectar o nó raiz do XML.");
  }

  return {
    recordsDetected,
    previewPayload: {
      rootName,
      sampleNodes,
    },
    errors,
  };
}