export function replaceSupplierBrandName(value: string): string {
  return value
    .replace(/à Stricker/gi, "ao fornecedor")
    .replace(/pela Stricker/gi, "pelo fornecedor")
    .replace(/da Stricker/gi, "do fornecedor")
    .replace(/na Stricker/gi, "no fornecedor")
    .replace(/Stricker/g, "Fornecedor")
    .replace(/stricker/g, "fornecedor");
}
