const SERVICE_CODE_PATTERN = /^[A-Za-z0-9._-]+$/;

/**
 * Valida a estrutura segura de um ServiceCode recebido do fornecedor.
 *
 * O campo combina produto, variante/localização e técnica. Alguns produtos
 * usam segmentos alfanuméricos (por exemplo, tamanhos têxteis) e outros
 * deixam segmentos intermédios vazios quando uma dimensão não se aplica.
 */
export function isSupplierServiceCode(
  value: string | null | undefined,
): value is string {
  if (!value) {
    return false;
  }

  const normalized = value.trim();

  if (
    normalized.length === 0 ||
    normalized.length > 255 ||
    normalized !== value
  ) {
    return false;
  }

  // O manual define ServiceCode pela sua função (produto + localização +
  // técnica), mas não fixa uma quantidade mínima de segmentos separados por
  // pontos. Validamos apenas o conjunto seguro de caracteres efetivamente
  // usado pelo fornecedor, sem rejeitar códigos válidos pela sua forma.
  return SERVICE_CODE_PATTERN.test(normalized);
}
