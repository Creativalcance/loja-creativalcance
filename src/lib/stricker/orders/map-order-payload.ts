import {
  type JsonRecord,
  type StrickerDestinationPayload,
  type StrickerMappedOrder,
  type StrickerOrderDatabaseItem,
  type StrickerOrderDatabaseRecord,
  type StrickerOrderValidationIssue,
  type StrickerOrderValidationResult,
  type StrickerPlaceOrderPayload,
  type StrickerProductOrderLinePayload,
  type StrickerServiceOrderLinePayload,
} from "@/lib/stricker/orders/types";

function getNullableString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function getRecordString(
  record: JsonRecord,
  key: string,
): string | null {
  return getNullableString(record[key]);
}

function getRecordBoolean(
  record: JsonRecord,
  key: string,
): boolean | null {
  const value = record[key];

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["true", "1", "yes", "sim"].includes(normalized)) {
      return true;
    }

    if (["false", "0", "no", "não", "nao"].includes(normalized)) {
      return false;
    }
  }

  return null;
}

function normalizeCountryCode(value: string | null): string {
  const normalized = value?.trim().toUpperCase();

  return normalized || "PT";
}

function normalizeCourier(
  shippingCarrier: string | null,
): string {
  const source = shippingCarrier?.trim() ?? "";

  const normalized = source.toLowerCase();

  if (
    normalized.includes("express") ||
    normalized.includes("urgente")
  ) {
    return "Express";
  }

  return "Economy";
}

function getItemSku(
  item: StrickerOrderDatabaseItem,
): string | null {
  return (
    item.supplier_sku?.trim() ||
    item.product_sku?.trim() ||
    null
  );
}

function getServiceCode(
  item: StrickerOrderDatabaseItem,
): string | null {
  return item.service_code?.trim() || null;
}

function getArtworkApproved(
  item: StrickerOrderDatabaseItem,
): boolean {
  const explicitApproved = getRecordBoolean(
    item.personalization_data,
    "approved",
  );

  if (explicitApproved !== null) {
    return explicitApproved;
  }

  /*
   * artwork_approved significa aprovação do ficheiro/maquete
   * dentro da nossa plataforma.
   */
  return item.artwork_approved;
}

function getCustomizationColors(
  item: StrickerOrderDatabaseItem,
): [
  string,
  string,
  string,
  string,
  string,
] {
  const data = item.personalization_data;
  const printColorMode = getRecordString(data, "printColorMode");
  const rawPrintColors = data.printColors;

  if (printColorMode === "full") {
    return ["", "", "", "", ""];
  }

  if (Array.isArray(rawPrintColors)) {
    const selectedColors = rawPrintColors
      .map((value) => {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
          return null;
        }

        return getRecordString(value as JsonRecord, "code");
      })
      .filter((value): value is string => Boolean(value))
      .slice(0, 5);

    if (selectedColors.length > 0) {
      return [
        selectedColors[0] ?? "",
        selectedColors[1] ?? "",
        selectedColors[2] ?? "",
        selectedColors[3] ?? "",
        selectedColors[4] ?? "",
      ];
    }
  }

  return [
    getRecordString(data, "color1") ?? "",
    getRecordString(data, "color2") ?? "",
    getRecordString(data, "color3") ?? "",
    getRecordString(data, "color4") ?? "",
    getRecordString(data, "color5") ?? "",
  ];
}

function getRequiredCustomizationColorCount(
  item: StrickerOrderDatabaseItem,
): number | null {
  const mode = getRecordString(item.personalization_data, "printColorMode");
  if (!mode?.startsWith("colors:")) return null;

  const count = Number(mode.split(":")[1]);
  return Number.isInteger(count) && count > 0 ? count : null;
}

function getTableOptionColorCount(
  item: StrickerOrderDatabaseItem,
): number | null {
  const match = item.table_code_option?.trim().match(/-(\d+)$/);
  const count = match?.[1] ? Number(match[1]) : null;
  return count && Number.isInteger(count) && count > 0 ? count : null;
}

function getLogoArea(
  item: StrickerOrderDatabaseItem,
): number {
  /*
   * A área usada nas tabelas de personalização da Stricker é expressa em
   * cm². Na nossa base, logo_area é guardada em mm², pelo que apenas a área
   * é convertida. LogoWidth e LogoHeight são enviados em milímetros, tal
   * como confirmado diretamente pelo fornecedor.
   */
  if (
    item.logo_area !== null &&
    Number.isFinite(Number(item.logo_area))
  ) {
    return Number((Number(item.logo_area) / 100).toFixed(4));
  }

  if (
    item.logo_width_mm !== null &&
    item.logo_height_mm !== null
  ) {
    return Number(
      (
        (Number(item.logo_width_mm) *
          Number(item.logo_height_mm)) /
        100
      ).toFixed(4),
    );
  }

  return 0;
}

function getLogoWidth(
  item: StrickerOrderDatabaseItem,
): number {
  return Number(Number(item.logo_width_mm ?? 0).toFixed(4));
}

function getLogoHeight(
  item: StrickerOrderDatabaseItem,
): number {
  return Number(Number(item.logo_height_mm ?? 0).toFixed(4));
}

function buildServiceOrderLine(
  item: StrickerOrderDatabaseItem,
): StrickerServiceOrderLinePayload {
  const colors = getCustomizationColors(item);

  return {
    /*
     * O OrderLineStamp só é conhecido depois de OrderV1.
     * É preenchido em submit-order.ts antes de ServiceOrderV1.
     */
    OrderLineStamp:
      item.supplier_order_line_stamp ?? "",

    ServCode: getServiceCode(item) ?? "",

    Color1: colors[0],
    Color2: colors[1],
    Color3: colors[2],
    Color4: colors[3],
    Color5: colors[4],

    LogoArea: getLogoArea(item),
    LogoWidth: getLogoWidth(item),
    LogoHeight: getLogoHeight(item),

    Appproved: getArtworkApproved(item),

    /*
     * Os bytes do ficheiro são carregados imediatamente
     * antes de ServiceOrderV1, para não manter ficheiros
     * grandes no payload intermédio.
     */
    Files: [],
  };
}

function buildDestination(
  order: StrickerOrderDatabaseRecord,
): StrickerDestinationPayload {
  const address = order.shipping_address;

  if (!address) {
    throw new Error(
      "A encomenda não possui morada de entrega.",
    );
  }

  const postalCodeParts = address.postal_code
    .trim()
    .match(/^(\d{4})[-\s]?(\d{3})$/);

  const recipient =
    address.company_name?.trim() ||
    order.company_name?.trim() ||
    address.contact_name?.trim() ||
    order.customer_name.trim();

  const streetAddress = [
    address.address_line_1,
    address.address_line_2,
  ]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .join(", ");

  return {
    // A documentação da Stricker define a primeira linha como destinatário
    // e a segunda como morada. Ambas são obrigatórias.
    AddressLine1: recipient,
    AddressLine2: streetAddress,

    Postalcode:
      postalCodeParts?.[1] ?? address.postal_code,
    ExtentionPostalcode:
      postalCodeParts?.[2] ?? "",

    City: address.city,

    Country: normalizeCountryCode(
      address.country_code,
    ),

    PhoneNumber: (
      address.contact_phone ??
      order.customer_phone ??
      ""
    ).replace(/[^\d]/g, ""),
  };
}

export function validateOrderForStricker(
  order: StrickerOrderDatabaseRecord,
): StrickerOrderValidationResult {
  const issues: StrickerOrderValidationIssue[] = [];

  if (order.payment_status !== "paid") {
    issues.push({
      field: "payment_status",
      message:
        "A encomenda ainda não se encontra paga.",
    });
  }

  if (!order.paid_at) {
    issues.push({
      field: "paid_at",
      message:
        "A encomenda não possui data de pagamento.",
    });
  }

  if (!order.shipping_address) {
    issues.push({
      field: "shipping_address_id",
      message:
        "A encomenda não possui uma morada de entrega válida.",
    });
  } else {
    if (!order.shipping_address.contact_name?.trim()) {
      issues.push({
        field: "shipping_address.contact_name",
        message:
          "O nome do contacto da morada está em falta.",
      });
    }

    if (!order.shipping_address.address_line_1?.trim()) {
      issues.push({
        field: "shipping_address.address_line_1",
        message:
          "A primeira linha da morada está em falta.",
      });
    }

    if (!order.shipping_address.postal_code?.trim()) {
      issues.push({
        field: "shipping_address.postal_code",
        message:
          "O código postal está em falta.",
      });
    }

    if (!order.shipping_address.city?.trim()) {
      issues.push({
        field: "shipping_address.city",
        message:
          "A localidade está em falta.",
      });
    }

    if (!order.shipping_address.country_code?.trim()) {
      issues.push({
        field: "shipping_address.country_code",
        message:
          "O país da morada está em falta.",
      });
    }
  }

  if (!order.customer_email?.trim()) {
    issues.push({
      field: "customer_email",
      message:
        "O e-mail do cliente está em falta.",
    });
  }

  if (
    !order.shipping_address?.contact_phone?.trim() &&
    !order.customer_phone?.trim()
  ) {
    issues.push({
      field: "shipping_address.contact_phone",
      message:
        "O telefone do contacto da morada está em falta.",
    });
  }

  if (order.order_items.length === 0) {
    issues.push({
      field: "order_items",
      message:
        "A encomenda não possui produtos.",
    });
  }

  for (const item of order.order_items) {
    const sku = getItemSku(item);

    if (!sku) {
      issues.push({
        field: "supplier_sku",
        orderItemId: item.id,
        message:
          `O produto "${item.product_name}" não possui SKU do fornecedor.`,
      });
    }

    if (
      !Number.isInteger(item.quantity) ||
      item.quantity <= 0
    ) {
      issues.push({
        field: "quantity",
        orderItemId: item.id,
        message:
          `A quantidade do produto "${item.product_name}" não é válida.`,
      });
    }

    if (item.personalization_required) {
      const serviceCode = getServiceCode(item);
      const requiredColorCount = getRequiredCustomizationColorCount(item);
      const selectedColors = getCustomizationColors(item).filter(Boolean);
      const tableOptionColorCount = getTableOptionColorCount(item);

      if (!serviceCode) {
        issues.push({
          field: "service_code",
          orderItemId: item.id,
          message:
            `A personalização de "${item.product_name}" não possui código de serviço do fornecedor.`,
        });
      }

      if (
        requiredColorCount !== null &&
        selectedColors.length !== requiredColorCount
      ) {
        issues.push({
          field: "personalization_data.printColors",
          orderItemId: item.id,
          message:
            `A personalização de "${item.product_name}" requer exatamente ${requiredColorCount} ${requiredColorCount === 1 ? "cor" : "cores"} de impressão.`,
        });
      }

      if (
        requiredColorCount !== null &&
        tableOptionColorCount !== null &&
        requiredColorCount !== tableOptionColorCount
      ) {
        issues.push({
          field: "table_code_option",
          orderItemId: item.id,
          message:
            `A opção de personalização de "${item.product_name}" não corresponde ao número de cores selecionado.`,
        });
      }

      if (
        !item.logo_storage_path &&
        !item.logo_url
      ) {
        issues.push({
          field: "logo_storage_path",
          orderItemId: item.id,
          message:
            `A personalização de "${item.product_name}" não possui ficheiro de logótipo.`,
        });
      }

      if (getLogoWidth(item) <= 0) {
        issues.push({
          field: "logo_width_mm",
          orderItemId: item.id,
          message:
            `A largura do logótipo de "${item.product_name}" não é válida.`,
        });
      }

      if (getLogoHeight(item) <= 0) {
        issues.push({
          field: "logo_height_mm",
          orderItemId: item.id,
          message:
            `A altura do logótipo de "${item.product_name}" não é válida.`,
        });
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export function mapOrderToStricker(
  order: StrickerOrderDatabaseRecord,
): StrickerMappedOrder {
  const validation = validateOrderForStricker(order);

  if (!validation.valid) {
    const errorMessage = validation.issues
      .map((issue) => issue.message)
      .join(" ");

    throw new Error(
      `A encomenda não reúne condições para submissão ao fornecedor. ${errorMessage}`,
    );
  }

  const itemsBySku = new Map<
    string,
    StrickerOrderDatabaseItem[]
  >();

  const productLines: StrickerProductOrderLinePayload[] =
    order.order_items.map((item) => {
      const sku = getItemSku(item);

      if (!sku) {
        throw new Error(
          `Não foi possível determinar o SKU do fornecedor de "${item.product_name}".`,
        );
      }

      const existingItems = itemsBySku.get(sku) ?? [];

      existingItems.push(item);
      itemsBySku.set(sku, existingItems);

      return {
        Sku: sku,
        Quantity: item.quantity,

        LineType: item.personalization_required
          ? "PRINT"
          : "SIMPLE",

        // O checkout exige o ficheiro antes do pagamento. A Stricker confirmou
        // que, nesse caso, a linha PRINT deve seguir com WaitArtWork=false e
        // ServiceOrderLines no próprio OrderV1. O payload com os bytes é
        // completado em submit-order.ts imediatamente antes do pedido.
        WaitArtWork:
          item.personalization_required &&
          !item.logo_storage_path &&
          !item.logo_url,

        Sample: false,
      };
    });

  const productPayload: StrickerPlaceOrderPayload = {
    destination: buildDestination(order),

    courier: normalizeCourier(
      order.shipping_carrier,
    ),

    /*
     * A Stricker exige que InternalReference seja única entre encomendas.
     * A referência interna introduzida pelo cliente é apenas uma etiqueta
     * comercial e pode repetir-se (por exemplo, "Evento" ou "Teste").
     * O número da encomenda é gerado pelo sistema e garante a unicidade sem
     * alterar a referência que continua guardada no nosso backoffice.
     */
    internalReference: order.order_number,

    relatedOrderStamp: null,

    shippingDate:
      order.requested_shipping_date?.trim() ||
      null,

    noShipping: order.no_shipping,

    observation:
      order.customer_notes ?? "",

    order: productLines,
  };

  const serviceItems = order.order_items
    .filter(
      (item) => item.personalization_required,
    )
    .map((item) => ({
      orderItemId: item.id,
      servicePayload: buildServiceOrderLine(item),
    }));

  return {
    orderId: order.id,
    orderNumber: order.order_number,

    testMode: order.supplier_test_mode,

    productPayload,
    itemsBySku,
    serviceItems,
  };
}
