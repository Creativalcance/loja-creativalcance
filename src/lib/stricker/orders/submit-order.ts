import path from "node:path";
import { notifyStrickerOrderSubmitted } from "@/lib/notifications/stricker-order-submitted";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  extractStrickerLineSku,
  extractStrickerOrderLineStamp,
  extractStrickerOrderLines,
  extractStrickerOrderStamp,
  extractStrickerOrderStatus,
  extractStrickerTrackingNumber,
  extractStrickerTrackingUrl,
  extractStrickerShippingDate,
  submitStrickerProductOrder,
  submitStrickerServiceOrder,
} from "@/lib/stricker/orders/client";
import {
  mapOrderToStricker,
  validateOrderForStricker,
} from "@/lib/stricker/orders/map-order-payload";
import {
  type JsonRecord,
  type StrickerMappedOrder,
  type StrickerOrderDatabaseItem,
  type StrickerOrderDatabaseRecord,
  type StrickerServiceArtworkFile,
  type SubmitOrderToStrickerResult,
} from "@/lib/stricker/orders/types";
import { isSupplierServiceCode } from "@/lib/stricker/service-code";
import { resolveCustomizationServiceCode } from "@/lib/stricker/resolve-customization-service-code";

type SupabaseAdminClient = ReturnType<
  typeof createSupabaseAdminClient
>;

type SupplierEventRecord = {
  id: string;
};

type OrderItemLineAssignment = {
  orderItemId: string;
  lineStamp: string;
};

type SupplierPrintingAreaLimit = {
  id: string;
  area_cm2: number | null;
};

const ARTWORK_BUCKET =
  process.env.STRICKER_ARTWORK_BUCKET?.trim() ||
  "customization-artwork";

function toJsonRecord(value: unknown): JsonRecord {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return {};
  }

  return value as JsonRecord;
}

async function resolveSupplierServiceCodes(params: {
  supabaseAdmin: SupabaseAdminClient;
  items: StrickerOrderDatabaseItem[];
}): Promise<StrickerOrderDatabaseItem[]> {
  const unresolvedItems = params.items.filter(
    (item) =>
      item.personalization_required &&
      !isSupplierServiceCode(item.service_code),
  );

  if (unresolvedItems.length === 0) {
    return params.items;
  }

  return Promise.all(
    params.items.map(async (item) => {
      if (
        !unresolvedItems.some((candidate) => candidate.id === item.id) ||
        !item.product_id
      ) {
        return item;
      }

      const resolvedServiceCode = await resolveCustomizationServiceCode({
        supabaseAdmin: params.supabaseAdmin,
        productId: item.product_id,
        variantId: item.variant_id,
        locationId: item.customization_location_id,
        locationName: item.customization_location_name,
        techniqueName: item.customization_technique_name,
        tableCode: item.table_code,
        tableCodeOption: item.table_code_option,
        currentServiceCode: item.service_code,
      });

      if (!resolvedServiceCode) {
        return { ...item, service_code: null };
      }

      const { error: updateError } = await params.supabaseAdmin
        .from("order_items")
        .update({ service_code: resolvedServiceCode })
        .eq("id", item.id);

      if (updateError) {
        throw new Error(
          `Não foi possível guardar o código de serviço validado: ${updateError.message}`,
        );
      }

      return { ...item, service_code: resolvedServiceCode };
    }),
  );
}

function getPricingTableId(item: StrickerOrderDatabaseItem): string | null {
  const pricing = toJsonRecord(item.personalization_data.pricing);
  const value = pricing.priceTableId;

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function constrainArtworkToSupplierPriceTable(params: {
  supabaseAdmin: SupabaseAdminClient;
  items: StrickerOrderDatabaseItem[];
}): Promise<StrickerOrderDatabaseItem[]> {
  const priceTableIds = Array.from(
    new Set(
      params.items
        .map(getPricingTableId)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  if (priceTableIds.length === 0) {
    return params.items;
  }

  const { data, error } = await params.supabaseAdmin
    .from("printing_price_tables")
    .select("id,area_cm2")
    .in("id", priceTableIds)
    .eq("is_active", true);

  if (error) {
    throw new Error(
      `Não foi possível validar a área máxima de personalização: ${error.message}`,
    );
  }

  const limits = new Map(
    ((data ?? []) as SupplierPrintingAreaLimit[]).map((row) => [
      row.id,
      row.area_cm2,
    ]),
  );

  return params.items.map((item) => {
    const priceTableId = getPricingTableId(item);
    const maximumAreaCm2 = priceTableId ? limits.get(priceTableId) : null;
    const widthMm = Number(item.logo_width_mm ?? 0);
    const heightMm = Number(item.logo_height_mm ?? 0);
    const currentAreaMm2 = widthMm * heightMm;
    const maximumAreaMm2 = Number(maximumAreaCm2 ?? 0) * 100;

    if (
      !item.personalization_required ||
      !Number.isFinite(currentAreaMm2) ||
      currentAreaMm2 <= 0 ||
      !Number.isFinite(maximumAreaMm2) ||
      maximumAreaMm2 <= 0 ||
      currentAreaMm2 <= maximumAreaMm2
    ) {
      return item;
    }

    const scale = Math.sqrt(maximumAreaMm2 / currentAreaMm2) * 0.999;
    const normalizedWidthMm = Number((widthMm * scale).toFixed(3));
    const normalizedHeightMm = Number((heightMm * scale).toFixed(3));

    return {
      ...item,
      logo_width_mm: normalizedWidthMm,
      logo_height_mm: normalizedHeightMm,
      logo_area: Number(
        (normalizedWidthMm * normalizedHeightMm).toFixed(3),
      ),
    };
  });
}

function getFileNameParts(fileName: string): {
  baseName: string;
  extension: string;
} {
  const extension = path.extname(fileName);

  const baseName =
    path.basename(fileName, extension).trim() ||
    "artwork";

  return {
    baseName,
    extension: extension || "",
  };
}

function bufferToNumberArray(
  value: ArrayBuffer,
): number[] {
  return Array.from(new Uint8Array(value));
}

function formatValidationErrors(
  order: StrickerOrderDatabaseRecord,
): string[] {
  const validation = validateOrderForStricker(order);

  return validation.issues.map((issue) => {
    if (issue.orderItemId) {
      return `${issue.message} [linha ${issue.orderItemId}]`;
    }

    return issue.message;
  });
}

async function fetchOrderForSubmission(params: {
  supabaseAdmin: SupabaseAdminClient;
  orderId: string;
}): Promise<StrickerOrderDatabaseRecord> {
  const { data, error } = await params.supabaseAdmin
    .from("orders")
    .select(
      `
        id,
        user_id,
        order_number,
        customer_email,
        customer_name,
        customer_phone,
        company_name,
        company_tax_id,
        status,
        payment_status,
        fulfillment_status,
        currency,
        grand_total,
        shipping_address_id,
        shipping_method,
        shipping_carrier,
        requested_shipping_date,
        no_shipping,
        internal_reference,
        customer_notes,
        paid_at,
        supplier_submission_status,
        supplier_order_stamp,
        supplier_order_number,
        supplier_last_status,
        supplier_last_response,
        supplier_submission_payload,
        supplier_submission_attempts,
        supplier_submission_error,
        supplier_submitted_at,
        supplier_test_mode,
        metadata,
        shipping_address:customer_addresses!orders_shipping_address_id_fkey (
          id,
          company_name,
          tax_id,
          contact_name,
          contact_email,
          contact_phone,
          address_line_1,
          address_line_2,
          postal_code,
          city,
          district,
          country_code
        ),
        order_items (
          id,
          order_id,
          product_id,
          variant_id,
          supplier_id,
          product_sku,
          product_name,
          quantity,
          personalization_required,
          personalization_notes,
          personalization_data,
          customization_draft_id,
          customization_location_id,
          customization_component_name,
          customization_location_name,
          customization_technique_name,
          supplier_product_reference,
          supplier_sku,
          service_code,
          table_code,
          table_code_option,
          handling_cost_code,
          printing_area_label,
          printing_width_mm,
          printing_height_mm,
          printing_area_mm2,
          logo_file_name,
          logo_storage_path,
          logo_url,
          mockup_storage_path,
          mockup_url,
          technical_preview_url,
          logo_width_mm,
          logo_height_mm,
          logo_area,
          artwork_status,
          artwork_approved,
          supplier_order_stamp,
          supplier_order_line_stamp,
          supplier_submission_status,
          supplier_submission_error,
          supplier_submitted_at
        )
      `,
    )
    .eq("id", params.orderId)
    .maybeSingle();

  if (error || !data) {
    throw new Error(
      error?.message ??
        "A encomenda não foi encontrada.",
    );
  }

  const rawOrder = data as unknown as {
    shipping_address:
      | StrickerOrderDatabaseRecord["shipping_address"]
      | StrickerOrderDatabaseRecord["shipping_address"][];
    order_items:
      | StrickerOrderDatabaseItem[]
      | null;
  } & Omit<
    StrickerOrderDatabaseRecord,
    "shipping_address" | "order_items"
  >;

  const shippingAddress = Array.isArray(
    rawOrder.shipping_address,
  )
    ? rawOrder.shipping_address[0] ?? null
    : rawOrder.shipping_address ?? null;

  const orderItemsWithServiceCodes = await resolveSupplierServiceCodes({
    supabaseAdmin: params.supabaseAdmin,
    items: rawOrder.order_items ?? [],
  });
  const orderItems = await constrainArtworkToSupplierPriceTable({
    supabaseAdmin: params.supabaseAdmin,
    items: orderItemsWithServiceCodes,
  });

  return {
    ...rawOrder,
    supplier_last_response: toJsonRecord(
      rawOrder.supplier_last_response,
    ),
    supplier_submission_payload: toJsonRecord(
      rawOrder.supplier_submission_payload,
    ),
    metadata: toJsonRecord(rawOrder.metadata),
    shipping_address: shippingAddress,
    order_items: orderItems,
  };
}

async function createSupplierEvent(params: {
  supabaseAdmin: SupabaseAdminClient;
  orderId: string;
  orderItemId?: string | null;
  supplierId?: string | null;
  eventType: string;
  requestPayload: JsonRecord;
  attemptNumber: number;
}): Promise<string> {
  const { data, error } = await params.supabaseAdmin
    .from("supplier_order_events")
    .insert({
      order_id: params.orderId,
      order_item_id: params.orderItemId ?? null,
      supplier_id: params.supplierId ?? null,

      event_type: params.eventType,
      direction: "outbound",
      status: "processing",

      request_payload: params.requestPayload,
      response_payload: {},

      attempt_number: params.attemptNumber,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single<SupplierEventRecord>();

  if (error || !data) {
    throw new Error(
      error?.message ??
        "Não foi possível criar o evento de integração.",
    );
  }

  return data.id;
}

async function completeSupplierEvent(params: {
  supabaseAdmin: SupabaseAdminClient;
  eventId: string;
  status: "success" | "failed" | "ignored";
  supplierOrderStamp?: string | null;
  supplierOrderLineStamp?: string | null;
  responsePayload?: JsonRecord;
  errorMessage?: string | null;
}): Promise<void> {
  const { error } = await params.supabaseAdmin
    .from("supplier_order_events")
    .update({
      status: params.status,

      supplier_order_stamp:
        params.supplierOrderStamp ?? null,

      supplier_order_line_stamp:
        params.supplierOrderLineStamp ?? null,

      response_payload:
        params.responsePayload ?? {},

      error_message:
        params.errorMessage ?? null,

      completed_at: new Date().toISOString(),
    })
    .eq("id", params.eventId);

  if (error) {
    throw new Error(error.message);
  }
}

async function updateOrderSubmissionState(params: {
  supabaseAdmin: SupabaseAdminClient;
  orderId: string;
  values: JsonRecord;
}): Promise<void> {
  const { error } = await params.supabaseAdmin
    .from("orders")
    .update(params.values)
    .eq("id", params.orderId);

  if (error) {
    throw new Error(error.message);
  }
}

async function updateOrderItemSubmissionState(params: {
  supabaseAdmin: SupabaseAdminClient;
  orderItemId: string;
  values: JsonRecord;
}): Promise<void> {
  const { error } = await params.supabaseAdmin
    .from("order_items")
    .update(params.values)
    .eq("id", params.orderItemId);

  if (error) {
    throw new Error(error.message);
  }
}

async function appendOrderStatusHistory(params: {
  supabaseAdmin: SupabaseAdminClient;
  orderId: string;
  previousStatus: string | null;
  newStatus: string;
  notes: string;
  metadata?: JsonRecord;
}): Promise<void> {
  const { error } = await params.supabaseAdmin
    .from("order_status_history")
    .insert({
      order_id: params.orderId,
      previous_status: params.previousStatus,
      new_status: params.newStatus,
      changed_by: null,
      notes: params.notes,
      metadata: params.metadata ?? {},
    });

  if (error) {
    throw new Error(error.message);
  }
}

async function markOrderAsFailed(params: {
  supabaseAdmin: SupabaseAdminClient;
  order: StrickerOrderDatabaseRecord;
  message: string;
  response?: JsonRecord;
}): Promise<void> {
  await updateOrderSubmissionState({
    supabaseAdmin: params.supabaseAdmin,
    orderId: params.order.id,
    values: {
      supplier_submission_status: "failed",
      supplier_submission_error: params.message,
      supplier_failed_at: new Date().toISOString(),
      supplier_last_response: params.response ?? {},
      status:
        params.order.status === "paid"
          ? "failed"
          : params.order.status,
    },
  });

  await appendOrderStatusHistory({
    supabaseAdmin: params.supabaseAdmin,
    orderId: params.order.id,
    previousStatus: params.order.status,
    newStatus: "failed",
    notes:
      "Falha na submissão automática da encomenda ao fornecedor.",
    metadata: {
      source: "stricker_submission",
      error: params.message,
    },
  });
}

async function downloadArtworkFile(params: {
  supabaseAdmin: SupabaseAdminClient;
  item: StrickerOrderDatabaseItem;
}): Promise<StrickerServiceArtworkFile> {
  let fileName =
    params.item.logo_file_name?.trim() ||
    "artwork";

  let arrayBuffer: ArrayBuffer;

  if (params.item.logo_storage_path) {
    const { data, error } =
      await params.supabaseAdmin.storage
        .from(ARTWORK_BUCKET)
        .download(params.item.logo_storage_path);

    if (error || !data) {
      throw new Error(
        error?.message ??
          `Não foi possível descarregar o logótipo de "${params.item.product_name}".`,
      );
    }

    arrayBuffer = await data.arrayBuffer();
  } else if (params.item.logo_url) {
    const response = await fetch(params.item.logo_url, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `Não foi possível descarregar o logótipo de "${params.item.product_name}": HTTP ${response.status}.`,
      );
    }

    arrayBuffer = await response.arrayBuffer();

    if (
      !params.item.logo_file_name &&
      params.item.logo_url
    ) {
      try {
        const url = new URL(params.item.logo_url);
        const candidateName = path.basename(url.pathname);

        if (candidateName) {
          fileName = candidateName;
        }
      } catch {
        // Mantém o nome alternativo.
      }
    }
  } else {
    throw new Error(
      `A linha "${params.item.product_name}" não possui ficheiro de arte.`,
    );
  }

  if (arrayBuffer.byteLength === 0) {
    throw new Error(
      `O ficheiro de arte de "${params.item.product_name}" está vazio.`,
    );
  }

  const maxFileSize =
    Number(
      process.env.STRICKER_MAX_ARTWORK_BYTES ??
        10 * 1024 * 1024,
    );

  if (arrayBuffer.byteLength > maxFileSize) {
    throw new Error(
      `O ficheiro de arte de "${params.item.product_name}" ultrapassa o limite permitido.`,
    );
  }

  const fileParts = getFileNameParts(fileName);

  return {
    FileName: fileParts.baseName,
    FileExtension: fileParts.extension,
    FileBytes: bufferToNumberArray(arrayBuffer),
  };
}

function buildOrderLineAssignments(params: {
  mappedOrder: StrickerMappedOrder;
  responseLines: JsonRecord[];
}): OrderItemLineAssignment[] {
  const assignments: OrderItemLineAssignment[] = [];
  const usedItemIds = new Set<string>();

  for (const responseLine of params.responseLines) {
    const lineStamp =
      extractStrickerOrderLineStamp(responseLine);

    if (!lineStamp) {
      continue;
    }

    const responseSku =
      extractStrickerLineSku(responseLine);

    let candidateItems: StrickerOrderDatabaseItem[] = [];

    if (responseSku) {
      candidateItems =
        params.mappedOrder.itemsBySku.get(responseSku) ??
        [];
    }

    if (candidateItems.length === 0) {
      candidateItems = Array.from(
        params.mappedOrder.itemsBySku.values(),
      ).flat();
    }

    const matchingItem = candidateItems.find(
      (item) => !usedItemIds.has(item.id),
    );

    if (!matchingItem) {
      continue;
    }

    usedItemIds.add(matchingItem.id);

    assignments.push({
      orderItemId: matchingItem.id,
      lineStamp,
    });
  }

  return assignments;
}

async function saveOrderLineAssignments(params: {
  supabaseAdmin: SupabaseAdminClient;
  orderStamp: string;
  assignments: OrderItemLineAssignment[];
}): Promise<void> {
  for (const assignment of params.assignments) {
    await updateOrderItemSubmissionState({
      supabaseAdmin: params.supabaseAdmin,
      orderItemId: assignment.orderItemId,
      values: {
        supplier_order_stamp: params.orderStamp,
        supplier_order_line_stamp:
          assignment.lineStamp,
        supplier_line_status: "submitted",
      },
    });
  }
}

async function submitPersonalizations(params: {
  supabaseAdmin: SupabaseAdminClient;
  order: StrickerOrderDatabaseRecord;
  mappedOrder: StrickerMappedOrder;
  orderStamp: string;
  attemptNumber: number;
}): Promise<{
  success: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  for (const serviceItem of params.mappedOrder.serviceItems) {
    const freshItem = params.order.order_items.find(
      (item) =>
        item.id === serviceItem.orderItemId,
    );

    if (!freshItem) {
      errors.push(
        `A linha ${serviceItem.orderItemId} deixou de estar disponível.`,
      );
      continue;
    }

    const { data: storedItem } =
      await params.supabaseAdmin
        .from("order_items")
        .select(
          "supplier_order_line_stamp,supplier_artwork_submission_status",
        )
        .eq("id", freshItem.id)
        .maybeSingle<{
          supplier_order_line_stamp: string | null;
          supplier_artwork_submission_status:
            | string
            | null;
        }>();

    const orderLineStamp =
      storedItem?.supplier_order_line_stamp ??
      freshItem.supplier_order_line_stamp;

    if (!orderLineStamp) {
      const message =
        `O fornecedor não devolveu o OrderLineStamp de "${freshItem.product_name}".`;

      errors.push(message);

      await updateOrderItemSubmissionState({
        supabaseAdmin: params.supabaseAdmin,
        orderItemId: freshItem.id,
        values: {
          supplier_submission_status: "failed",
          supplier_submission_error: message,
          supplier_artwork_submission_status:
            "failed",
        },
      });

      continue;
    }

    if (
      storedItem?.supplier_artwork_submission_status ===
      "submitted"
    ) {
      continue;
    }

    let eventId: string | null = null;

    try {
      const artworkFile = await downloadArtworkFile({
        supabaseAdmin: params.supabaseAdmin,
        item: freshItem,
      });

      const servicePayload = {
        orderStamp: params.orderStamp,
        order: [
          {
            ...serviceItem.servicePayload,
            OrderLineStamp: orderLineStamp,
            Files: [artworkFile],
          },
        ],
      };

      eventId = await createSupplierEvent({
        supabaseAdmin: params.supabaseAdmin,
        orderId: params.order.id,
        orderItemId: freshItem.id,
        supplierId: freshItem.supplier_id,
        eventType: "service_order_submission",
        requestPayload: {
          ...servicePayload,
          order: servicePayload.order.map((line) => ({
            ...line,
            Files: line.Files.map((file) => ({
              FileName: file.FileName,
              FileExtension: file.FileExtension,
              FileSize: file.FileBytes.length,
            })),
          })),
        },
        attemptNumber: params.attemptNumber,
      });

      await updateOrderItemSubmissionState({
        supabaseAdmin: params.supabaseAdmin,
        orderItemId: freshItem.id,
        values: {
          supplier_artwork_submission_status:
            "submitting",
          supplier_submission_status: "submitting",
          supplier_submission_error: null,
        },
      });

      const result =
        await submitStrickerServiceOrder(
          servicePayload,
          {
            testMode: params.mappedOrder.testMode,
          },
        );

      await completeSupplierEvent({
        supabaseAdmin: params.supabaseAdmin,
        eventId,
        status: "success",
        supplierOrderStamp: params.orderStamp,
        supplierOrderLineStamp: orderLineStamp,
        responsePayload:
          result.response as unknown as JsonRecord,
      });

      await updateOrderItemSubmissionState({
        supabaseAdmin: params.supabaseAdmin,
        orderItemId: freshItem.id,
        values: {
          supplier_order_stamp: params.orderStamp,
          supplier_order_line_stamp: orderLineStamp,

          supplier_submission_status: "submitted",
          supplier_submission_error: null,
          supplier_submitted_at:
            new Date().toISOString(),

          supplier_artwork_submission_status:
            "submitted",

          supplier_artwork_submitted_at:
            new Date().toISOString(),

          supplier_line_response:
            result.response as unknown as JsonRecord,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro inesperado na submissão da personalização.";

      errors.push(
        `${freshItem.product_name}: ${message}`,
      );

      if (eventId) {
        await completeSupplierEvent({
          supabaseAdmin: params.supabaseAdmin,
          eventId,
          status: "failed",
          supplierOrderStamp: params.orderStamp,
          supplierOrderLineStamp: orderLineStamp,
          errorMessage: message,
        });
      }

      await updateOrderItemSubmissionState({
        supabaseAdmin: params.supabaseAdmin,
        orderItemId: freshItem.id,
        values: {
          supplier_submission_status: "failed",
          supplier_submission_error: message,
          supplier_artwork_submission_status:
            "failed",
        },
      });
    }
  }

  return {
    success: errors.length === 0,
    errors,
  };
}

export async function submitPaidOrderToStricker(
  orderId: string,
): Promise<SubmitOrderToStrickerResult> {
  const supabaseAdmin =
    createSupabaseAdminClient();

  const order = await fetchOrderForSubmission({
    supabaseAdmin,
    orderId,
  });

  const baseResult = {
    orderId: order.id,
    orderNumber: order.order_number,
    testMode: order.supplier_test_mode,
  };

  if (
    order.supplier_submission_status ===
      "submitted" &&
    order.supplier_order_stamp
  ) {
    try {
      await notifyStrickerOrderSubmitted({
        order,
        supplierOrderStamp: order.supplier_order_stamp,
      });
    } catch (error) {
      console.error(
        "A encomenda já estava submetida, mas a notificação administrativa falhou:",
        error,
      );
    }

    return {
      ...baseResult,
      success: true,
      alreadySubmitted: true,

      supplierOrderStamp:
        order.supplier_order_stamp,

      supplierStatus:
        order.supplier_last_status,

      productSubmitted: true,

      personalizationSubmitted:
        order.order_items
          .filter(
            (item) =>
              item.personalization_required,
          )
          .every(
            (item) =>
              item.supplier_submission_status ===
              "submitted",
          ),

      message:
        "A encomenda já tinha sido submetida ao fornecedor.",

      errors: [],
    };
  }

  if (
    order.supplier_submission_status ===
    "submitting"
  ) {
    return {
      ...baseResult,
      success: false,
      alreadySubmitted: false,

      supplierOrderStamp:
        order.supplier_order_stamp,

      supplierStatus:
        order.supplier_last_status,

      productSubmitted: Boolean(
        order.supplier_order_stamp,
      ),

      personalizationSubmitted: false,

      message:
        "A encomenda já está a ser submetida ao fornecedor.",

      errors: [
        "Foi detetado outro processo de submissão em curso.",
      ],
    };
  }

  const validationErrors =
    formatValidationErrors(order);

  if (validationErrors.length > 0) {
    const message =
      "A encomenda paga não reúne todos os requisitos para submissão automática.";

    await markOrderAsFailed({
      supabaseAdmin,
      order,
      message: `${message} ${validationErrors.join(
        " ",
      )}`,
    });

    return {
      ...baseResult,
      success: false,
      alreadySubmitted: false,

      supplierOrderStamp:
        order.supplier_order_stamp,

      supplierStatus:
        order.supplier_last_status,

      productSubmitted: false,
      personalizationSubmitted: false,

      message,
      errors: validationErrors,
    };
  }

  const attemptNumber =
    Number(
      order.supplier_submission_attempts ?? 0,
    ) + 1;

  const lockResult = await supabaseAdmin
    .from("orders")
    .update({
      supplier_submission_status: "submitting",
      supplier_submission_attempts: attemptNumber,
      supplier_submission_error: null,
      supplier_failed_at: null,
    })
    .eq("id", order.id)
    .neq(
      "supplier_submission_status",
      "submitting",
    )
    .select("id")
    .maybeSingle<{ id: string }>();

  if (
    lockResult.error ||
    !lockResult.data
  ) {
    return {
      ...baseResult,
      success: false,
      alreadySubmitted: false,

      supplierOrderStamp:
        order.supplier_order_stamp,

      supplierStatus:
        order.supplier_last_status,

      productSubmitted: Boolean(
        order.supplier_order_stamp,
      ),

      personalizationSubmitted: false,

      message:
        "Não foi possível obter o bloqueio de submissão da encomenda.",

      errors: [
        lockResult.error?.message ??
          "Outro processo poderá estar a submeter esta encomenda.",
      ],
    };
  }

  const mappedOrder =
    mapOrderToStricker(order);

  let supplierOrderStamp =
    order.supplier_order_stamp;

  let supplierStatus =
    order.supplier_last_status;

  let productSubmitted = Boolean(
    supplierOrderStamp,
  );

  let personalizationSubmitted = false;

  let productEventId: string | null = null;

  try {
    if (!supplierOrderStamp) {
      productEventId =
        await createSupplierEvent({
          supabaseAdmin,
          orderId: order.id,
          supplierId:
            order.order_items[0]?.supplier_id ??
            null,
          eventType: "product_order_submission",
          requestPayload:
            mappedOrder.productPayload as unknown as JsonRecord,
          attemptNumber,
        });

      await updateOrderSubmissionState({
        supabaseAdmin,
        orderId: order.id,
        values: {
          supplier_submission_payload:
            mappedOrder.productPayload as unknown as JsonRecord,
        },
      });

      const productResult =
        await submitStrickerProductOrder(
          mappedOrder.productPayload,
          {
            testMode: mappedOrder.testMode,
          },
        );

      supplierOrderStamp =
        extractStrickerOrderStamp(
          productResult.orderDetails,
        );

      supplierStatus =
        extractStrickerOrderStatus(
          productResult.orderDetails,
        );

      if (!supplierOrderStamp) {
        throw new Error(
          "O fornecedor não devolveu o OrderStamp da encomenda.",
        );
      }

      const trackingNumber =
        extractStrickerTrackingNumber(
          productResult.orderDetails,
        );

      const trackingUrl =
        extractStrickerTrackingUrl(
          productResult.orderDetails,
        );
      const supplierShippingDate = extractStrickerShippingDate(productResult.orderDetails);

      const responseLines =
        extractStrickerOrderLines(
          productResult.orderDetails,
        ).map((line) => toJsonRecord(line));

      const assignments =
        buildOrderLineAssignments({
          mappedOrder,
          responseLines,
        });

      await saveOrderLineAssignments({
        supabaseAdmin,
        orderStamp: supplierOrderStamp,
        assignments,
      });

      await completeSupplierEvent({
        supabaseAdmin,
        eventId: productEventId,
        status: "success",
        supplierOrderStamp,
        responsePayload:
          productResult.response as unknown as JsonRecord,
      });

      await updateOrderSubmissionState({
        supabaseAdmin,
        orderId: order.id,
        values: {
          supplier_order_stamp:
            supplierOrderStamp,

          supplier_order_number:
            supplierOrderStamp,

          supplier_last_status:
            supplierStatus,

          supplier_last_response:
            productResult.response as unknown as JsonRecord,

          supplier_tracking_number:
            trackingNumber,

          supplier_tracking_url:
            trackingUrl,

          supplier_shipping_date:
            supplierShippingDate,

          supplier_submitted_at:
            new Date().toISOString(),

          status: "sent_to_supplier",
        },
      });

      await appendOrderStatusHistory({
        supabaseAdmin,
        orderId: order.id,
        previousStatus: order.status,
        newStatus: "sent_to_supplier",
        notes:
          "Encomenda de produtos submetida automaticamente ao fornecedor após confirmação do pagamento.",
        metadata: {
          source: "stricker_submission",
          supplierOrderStamp,
          testMode: mappedOrder.testMode,
        },
      });

      productSubmitted = true;
    }

    if (!supplierOrderStamp) {
      throw new Error(
        "Não existe OrderStamp para submeter as personalizações.",
      );
    }

    const personalizationResult =
      await submitPersonalizations({
        supabaseAdmin,
        order,
        mappedOrder,
        orderStamp: supplierOrderStamp,
        attemptNumber,
      });

    personalizationSubmitted =
      personalizationResult.success;

    const finalSubmissionStatus =
      personalizationResult.errors.length > 0
        ? "partially_submitted"
        : "submitted";

    await updateOrderSubmissionState({
      supabaseAdmin,
      orderId: order.id,
      values: {
        supplier_submission_status:
          finalSubmissionStatus,

        supplier_submission_error:
          personalizationResult.errors.length > 0
            ? personalizationResult.errors.join(
                " | ",
              )
            : null,

        supplier_submitted_at:
          new Date().toISOString(),

        supplier_last_status:
          supplierStatus,

        status:
          finalSubmissionStatus === "submitted"
            ? "sent_to_supplier"
            : "processing",
      },
    });

    await appendOrderStatusHistory({
      supabaseAdmin,
      orderId: order.id,
      previousStatus: "sent_to_supplier",
      newStatus:
        finalSubmissionStatus === "submitted"
          ? "sent_to_supplier"
          : "processing",
      notes:
        finalSubmissionStatus === "submitted"
          ? "Produtos e personalizações submetidos ao fornecedor."
          : "Produtos submetidos, mas existem personalizações pendentes ou com erro.",
      metadata: {
        source: "stricker_submission",
        supplierOrderStamp,
        supplierSubmissionStatus:
          finalSubmissionStatus,
        personalizationErrors:
          personalizationResult.errors,
      },
    });

    if (finalSubmissionStatus === "submitted") {
      try {
        await notifyStrickerOrderSubmitted({
          order,
          supplierOrderStamp,
        });
      } catch (error) {
        console.error(
          "A encomenda foi submetida ao fornecedor, mas a notificação administrativa falhou:",
          error,
        );
      }
    }

    return {
      ...baseResult,
      success:
        finalSubmissionStatus === "submitted",

      alreadySubmitted: false,

      supplierOrderStamp,
      supplierStatus,

      productSubmitted,
      personalizationSubmitted,

      message:
        finalSubmissionStatus === "submitted"
          ? "Encomenda submetida automaticamente ao fornecedor."
          : "Os produtos foram submetidos, mas existem personalizações que exigem intervenção.",

      errors: personalizationResult.errors,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erro inesperado na submissão ao fornecedor.";

    if (productEventId) {
      try {
        await completeSupplierEvent({
          supabaseAdmin,
          eventId: productEventId,
          status: "failed",
          supplierOrderStamp,
          errorMessage: message,
        });
      } catch {
        // O erro principal deve ser preservado.
      }
    }

    await markOrderAsFailed({
      supabaseAdmin,
      order,
      message,
    });

    return {
      ...baseResult,
      success: false,
      alreadySubmitted: false,

      supplierOrderStamp,
      supplierStatus,

      productSubmitted,
      personalizationSubmitted,

      message:
        "A submissão automática ao fornecedor falhou.",

      errors: [message],
    };
  }
}
