import {
  normalizeManualColors,
  type NormalizedManualColor,
} from "./colors";
import {
  normalizeManualProductTypes,
  type NormalizedManualProductType,
} from "./product-types";
import {
  normalizeManualProductsTree,
  type NormalizedManualProductsTreeProduct,
} from "./products-tree";

export type ManualNormalizerDatasetName =
  | "colors"
  | "productTypes"
  | "productsTree";

export type ManualNormalizerResult =
  | {
      datasetName: "colors";
      records: NormalizedManualColor[];
    }
  | {
      datasetName: "productTypes";
      records: NormalizedManualProductType[];
    }
  | {
      datasetName: "productsTree";
      records: NormalizedManualProductsTreeProduct[];
    };

export function normalizeManualImportDataset(params: {
  datasetName: string;
  content: string;
  extension: string;
}): ManualNormalizerResult {
  const { datasetName, content, extension } = params;

  if (datasetName === "colors") {
    return {
      datasetName: "colors",
      records: normalizeManualColors(content, extension),
    };
  }

  if (datasetName === "productTypes") {
    return {
      datasetName: "productTypes",
      records: normalizeManualProductTypes(content, extension),
    };
  }

  if (datasetName === "productsTree") {
    return {
      datasetName: "productsTree",
      records: normalizeManualProductsTree(content, extension),
    };
  }

  throw new Error(`Dataset não suportado para normalização: ${datasetName}`);
}