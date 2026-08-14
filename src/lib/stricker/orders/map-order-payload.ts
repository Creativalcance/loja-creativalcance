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

function getRecordNumber(
  record: JsonRecord,
  key: string,
): number | null {
  const value = record[key];

  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(
      value
        .replace(/\s+/g, "")
        .replace(",", ".")
        .replace(/[^\d.-]/g, ""),
    );

    return Number.isFinite(parsed) ? parsed : null;
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

  return [
    getRecordString(data, "color1") ?? "",
    getRecordString(data, "color2") ?? "",
    getRecordString(data, "color3") ?? "",
    getRecordString(data, "color4") ?? "",
    getRecordString(data, "color5") ?? "",
  ];
}

function getCustomizationGroup(
  item: StrickerOrderDatabaseItem,
): number {
  const group = getRecordNumber(
    item.personalization_data,
    "group",
  );

  if (
    group !== null &&
    Number.isInteger(group) &&
    group >= 1 &&
    group <= 3
  ) {
    return group;
  }

  return 1;
}

function getLogoArea(
  item: StrickerOrderDatabaseItem,
): number {
  if (
    item.logo_area !== null &&
    Number.isFinite(Number(item.logo_area))
  ) {
    return Number(item.logo_area);
  }

  if (
    item.logo_width_mm !== null &&
    item.logo_height_mm !== null
  ) {
    /*
     * A documentação Stricker identifica a área do logótipo,
     * mas não é totalmente explícita sobre a unidade.
     * Guardamos e enviamos a área em cm².
     */
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
  return Number(item.logo_width_mm ?? 0);
}

function getLogoHeight(
  item: StrickerOrderDatabaseItem,
): number {
  return Number(item.logo_height_mm ?? 0);
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

    Group: getCustomizationGroup(item),

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

  return {
    AddressLine1: address.address_line_1,
    AddressLine2: address.address_line_2 ?? "",

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

      if (!serviceCode) {
        issues.push({
          field: "service_code",
          orderItemId: item.id,
          message:
            `A personalização de "${item.product_name}" não possui código de serviço do fornecedor.`,
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

        /*
         * Criamos primeiro a linha PRINT e enviamos a arte
         * imediatamente depois por ServiceOrderV1.
         */
        // A linha é criada a aguardar arte e é completada
        // imediatamente depois através de ServiceOrderV1.
        WaitArtWork: item.personalization_required,

        Sample: false,
      };
    });

  const productPayload: StrickerPlaceOrderPayload = {
    destination: buildDestination(order),

    courier: normalizeCourier(
      order.shipping_carrier,
    ),

    internalReference:
      order.internal_reference ??
      order.order_number,

    relatedOrderStamp: null,

    shippingDate: null,

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
