const SERVICE_CODE_SEGMENT_PATTERN = /^[A-Za-z0-9_-]*$/;

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

  const segments = normalized.split(".");

  return (
    segments.length >= 4 &&
    segments[0].length > 0 &&
    segments[segments.length - 1].length > 0 &&
    segments.every((segment) =>
      SERVICE_CODE_SEGMENT_PATTERN.test(segment),
    )
  );
}
