"use server";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { assertAdminAccess } from "@/lib/auth/assert-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { SITE_LOCALES, localizePath } from "@/lib/i18n/config";
import { agentSchema, contactSchema, moneyCents, uuid } from "./validation";
import { findSalesAccount, canLinkSalesAccount } from "./account";
import { assertSalesAccess } from "./access";
import { salesCopy } from "./i18n";
import { checkSalesRefunds } from "./reconcile";
import { sendSalesInvitation, retrySalesEmails } from "./email";
import type { SalesAgent, SalesActionState } from "./types";
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
function refresh() {
  revalidatePath("/admin/rede-comercial", "layout");
  for (const locale of Object.keys(SITE_LOCALES) as Array<
    keyof typeof SITE_LOCALES
  >)
    revalidatePath(localizePath("/area-comercial", locale), "layout");
  revalidatePath("/admin/utilizadores");
}
function failure(e: unknown): SalesActionState {
  return {
    success: false,
    message:
      e instanceof Error ? e.message : "Não foi possível concluir a operação.",
  };
}
async function mutate(
  actor: string,
  action: string,
  data: Record<string, unknown>,
) {
  const result = await createSupabaseAdminClient().rpc("sales_admin_mutate", {
    p_actor: actor,
    p_action: action,
    p_data: data,
  });
  if (result.error) throw new Error(result.error.message);
  return result.data as { id: string; duplicate?: boolean };
}

export async function saveAgentAction(
  _state: SalesActionState,
  form: FormData,
): Promise<SalesActionState> {
  const { userId } = await assertAdminAccess("/admin/rede-comercial");
  try {
    const agentId = str(form, "agent_id");
    if (agentId) uuid.parse(agentId);
    const parsed = agentSchema.safeParse({
      full_name: str(form, "full_name"),
      email: str(form, "email"),
      phone: str(form, "phone"),
      company_name: str(form, "company_name"),
      tax_id: str(form, "tax_id"),
      billing_address: str(form, "billing_address"),
      iban: str(form, "iban"),
      countries: form.getAll("countries").map(String),
      locale: str(form, "locale"),
      status: str(form, "status") || "draft",
      supplier_rate_bps: str(form, "supplier_rate")
        ? moneyCents(str(form, "supplier_rate"))
        : null,
      manual_rate_bps: str(form, "manual_rate")
        ? moneyCents(str(form, "manual_rate"))
        : null,
      hold_days: str(form, "hold_days"),
      attribution_months: str(form, "attribution_months"),
      recurring:
        str(form, "recurring") === ""
          ? null
          : str(form, "recurring") === "true",
      commission_enabled: form.get("commission_enabled") === "on",
      monthly_target_cents: moneyCents(str(form, "monthly_target") || "0"),
      starts_on: str(form, "starts_on"),
      ends_on: str(form, "ends_on") || null,
    });
    if (!parsed.success)
      return {
        success: false,
        message: parsed.error.issues.map((i) => i.message).join(" "),
      };
    const { id } = await mutate(userId, "save_agent", {
      ...parsed.data,
      agent_id: agentId || null,
    });
    refresh();
    return {
      success: true,
      message:
        "Ficha guardada. As condições aplicam-se às novas encomendas atribuídas.",
      id,
    };
  } catch (e) {
    return failure(e);
  }
}
export async function inviteAgentAction(
  _state: SalesActionState,
  form: FormData,
): Promise<SalesActionState> {
  const { userId } = await assertAdminAccess("/admin/rede-comercial");
  const admin = createSupabaseAdminClient();
  let agentId = "";
  let newUserId: string | null = null;
  let linked = false;
  try {
    agentId = uuid.parse(str(form, "agent_id"));
    const initial = await admin
      .from("sales_agents")
      .select("*")
      .eq("id", agentId)
      .single<SalesAgent>();
    let agent = initial.data;
    if (initial.error || !agent) throw new Error("Comercial inexistente.");
    if (agent.status === "suspended")
      throw new Error("Reativa o comercial antes de enviar um convite.");
    if (
      agent.status === "invited" &&
      agent.account_kind === "new_account" &&
      agent.invitation_sent_at &&
      Date.now() - Date.parse(agent.invitation_sent_at) < 60000
    )
      throw new Error(
        "O convite já foi enviado. Aguarda um minuto antes de reenviar.",
      );
    if (
      str(form, "expected_email") !== agent.email ||
      str(form, "expected_updated_at") !== agent.updated_at
    )
      throw new Error(
        "A ficha mudou. Guarda os dados e confirma novamente a conta.",
      );
    if (str(form, "confirm_account") !== "on")
      throw new Error("Confirma a conta indicada antes de continuar.");
    const expected = {
      expected_email: agent.email,
      expected_updated_at: agent.updated_at,
    };
    if (!agent.user_id) {
      const account = await findSalesAccount(userId, agent.email);
      if (account) {
        if (
          str(form, "account_mode") !== "existing" ||
          str(form, "existing_user_id") !== account.id
        )
          throw new Error(
            "Já existe uma conta com este email. Atualiza a página para confirmar a associação.",
          );
        if (!canLinkSalesAccount(account, agent.id))
          throw new Error(
            "Verifica o estado, a confirmação do email e a associação desta conta.",
          );
        await mutate(userId, "link_existing_account", {
          agent_id: agent.id,
          user_id: account.id,
          ...expected,
        });
        linked = true;
        try {
          await retrySalesEmails(1, agent.id);
        } catch {
          /* The transaction retained the email for retry. */
        }
        refresh();
        return {
          success: true,
          message:
            "Acesso comercial ativado na conta existente. O email de acesso foi preparado e será reenviado automaticamente se necessário.",
        };
      }
      if (str(form, "account_mode") !== "new")
        throw new Error("A conta mudou. Atualiza a página antes de continuar.");
      // Creation and association are separate confirmed operations; an email race never converts an existing identity.
      const created = await admin.auth.admin.createUser({
        email: agent.email,
        password: randomBytes(48).toString("base64url"),
        email_confirm: true,
        user_metadata: {
          full_name: agent.full_name,
          locale: agent.locale,
          preferred_locale: agent.locale,
        },
      });
      if (created.error || !created.data.user)
        throw new Error(
          "Não foi possível criar a conta. Atualiza a página para verificar se o email já está registado.",
        );
      newUserId = created.data.user.id;
      await mutate(userId, "link_account", {
        agent_id: agentId,
        user_id: newUserId,
        ...expected,
      });
      linked = true;
      const updated = await admin
        .from("sales_agents")
        .select("*")
        .eq("id", agentId)
        .single<SalesAgent>();
      if (updated.error || !updated.data)
        throw new Error(
          "Conta criada. Atualiza a página para enviar o convite.",
        );
      agent = updated.data;
    }
    if (
      agent.account_kind === "existing_account" ||
      agent.status === "active"
    ) {
      await mutate(userId, "queue_access_notice", { agent_id: agent.id });
      try {
        await retrySalesEmails(1, agent.id);
      } catch {
        /* Retry is persisted. */
      }
      refresh();
      return {
        success: true,
        message:
          "O acesso está ativo. O email de informação está registado para envio, sem alterar a palavra-passe.",
      };
    }
    await sendSalesInvitation(agent);
    refresh();
    return {
      success: true,
      message: "Convite enviado no idioma do comercial.",
    };
  } catch (e) {
    if (newUserId && !linked) {
      // Never delete an account when the linking transaction may have committed.
      const check = await admin
        .from("sales_agents")
        .select("id")
        .eq("user_id", newUserId)
        .maybeSingle();
      if (!check.error && !check.data)
        await admin.auth.admin.deleteUser(newUserId);
    }
    if (agentId)
      await admin
        .from("sales_agents")
        .update({
          invitation_error:
            "O convite não foi concluído. Consulta os dados e tenta reenviar.",
        })
        .eq("id", agentId);
    refresh();
    return failure(e);
  }
}
export async function assignCustomerAction(
  _state: SalesActionState,
  form: FormData,
): Promise<SalesActionState> {
  const { userId } = await assertAdminAccess("/admin/rede-comercial");
  try {
    const id = uuid.parse(str(form, "agent_id"));
    const admin = createSupabaseAdminClient();
    const { data: customer, error } = await admin
      .from("profiles")
      .select("id")
      .eq("email", str(form, "customer_email").toLowerCase())
      .eq("role", "customer")
      .eq("is_active", true)
      .maybeSingle();
    if (error || !customer)
      throw new Error("Não foi encontrado um cliente ativo com esse email.");
    await mutate(userId, "assign_customer", {
      agent_id: id,
      customer_user_id: customer.id,
      reason: str(form, "reason"),
    });
    refresh();
    return {
      success: true,
      message:
        "Cliente atribuído. As novas encomendas ficam associadas a este comercial.",
    };
  } catch (e) {
    return failure(e);
  }
}
export async function endAssignmentAction(
  _state: SalesActionState,
  form: FormData,
): Promise<SalesActionState> {
  const { userId } = await assertAdminAccess("/admin/rede-comercial");
  try {
    await mutate(userId, "end_assignment", {
      agent_id: uuid.parse(str(form, "agent_id")),
      assignment_id: uuid.parse(str(form, "assignment_id")),
      reason: str(form, "reason"),
    });
    refresh();
    return {
      success: true,
      message:
        "Atribuição terminada. O histórico das encomendas foi preservado.",
    };
  } catch (e) {
    return failure(e);
  }
}
export async function approveCommissionAction(
  _state: SalesActionState,
  form: FormData,
): Promise<SalesActionState> {
  const { userId } = await assertAdminAccess("/admin/rede-comercial");
  try {
    await checkSalesRefunds(
      uuid.parse(str(form, "agent_id")),
      uuid.parse(str(form, "order_id")),
    );
    await mutate(userId, "approve", {
      agent_id: uuid.parse(str(form, "agent_id")),
      order_id: uuid.parse(str(form, "order_id")),
      expected_cents: str(form, "expected_cents"),
    });
    refresh();
    return { success: true, message: "Comissão aprovada." };
  } catch (e) {
    return failure(e);
  }
}
export async function allocateRefundAction(
  _state: SalesActionState,
  form: FormData,
): Promise<SalesActionState> {
  const { userId } = await assertAdminAccess("/admin/rede-comercial");
  try {
    await mutate(userId, "allocate_refund", {
      agent_id: uuid.parse(str(form, "agent_id")),
      order_id: uuid.parse(str(form, "order_id")),
      refund_cents: str(form, "refund_cents"),
      supplier_net_cents: moneyCents(str(form, "supplier_net")),
      manual_net_cents: moneyCents(str(form, "manual_net")),
      reason: str(form, "reason"),
    });
    refresh();
    return {
      success: true,
      message: "Reembolso repartido. Revê a comissão antes de aprovar.",
    };
  } catch (e) {
    return failure(e);
  }
}
export async function recordPayoutAction(
  _state: SalesActionState,
  form: FormData,
): Promise<SalesActionState> {
  const { userId } = await assertAdminAccess("/admin/rede-comercial");
  let path: string | null = null;
  let recorded = false;
  let requestId = "";
  try {
    const agentId = uuid.parse(str(form, "agent_id"));
    requestId = uuid.parse(str(form, "request_id"));
    const file = form.get("proof");
    const admin = createSupabaseAdminClient();
    const already = await admin
      .from("sales_payouts")
      .select("id")
      .eq("id", requestId)
      .eq("agent_id", agentId)
      .maybeSingle();
    if (already.data)
      return { success: true, message: "Este pagamento já foi registado." };
    if (file instanceof File && file.size) {
      if (
        file.size > 3145728 ||
        !["application/pdf", "image/png", "image/jpeg"].includes(file.type)
      )
        throw new Error("O comprovativo deve ser PDF, PNG ou JPG, até 3 MB.");
      path = `${agentId}/${requestId}/${crypto.randomUUID()}.${file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg"}`;
      const upload = await admin.storage
        .from("sales-documents")
        .upload(path, await file.arrayBuffer(), {
          contentType: file.type,
          upsert: false,
        });
      if (upload.error)
        throw new Error("Não foi possível guardar o comprovativo.");
    }
    await checkSalesRefunds(agentId);
    const result = await mutate(userId, "payout", {
      agent_id: agentId,
      request_id: requestId,
      expected_cents: str(form, "expected_cents"),
      currency: str(form, "currency"),
      period: str(form, "period") + "-01",
      paid_at: str(form, "paid_at"),
      reference: str(form, "reference"),
      proof_path: path,
    });
    recorded = true;
    if (result.duplicate && path)
      await admin.storage.from("sales-documents").remove([path]);
    try {
      await retrySalesEmails(2);
    } catch {
      /* Persisted outbox is retried by the email worker. */
    }
    refresh();
    return {
      success: true,
      message:
        "Pagamento registado. O aviso ao comercial fica registado para envio.",
    };
  } catch (e) {
    if (path && !recorded && requestId) {
      const admin = createSupabaseAdminClient();
      const check = await admin
        .from("sales_payouts")
        .select("id")
        .eq("id", requestId)
        .maybeSingle();
      if (check.data) recorded = true;
      else if (!check.error)
        await admin.storage.from("sales-documents").remove([path]);
    }
    refresh();
    return recorded
      ? {
          success: true,
          message: "Pagamento registado. O aviso fica na fila de envio.",
        }
      : failure(e);
  }
}
export async function saveSalesContactAction(
  _state: SalesActionState,
  form: FormData,
): Promise<SalesActionState> {
  const { agent } = await assertSalesAccess();
  const t = salesCopy(agent.locale);
  try {
    const result = contactSchema.safeParse({
      name: str(form, "name"),
      email: str(form, "email"),
      phone: str(form, "phone"),
      company_name: str(form, "company_name"),
      country_code: str(form, "country_code"),
      stage: str(form, "stage"),
      notes: str(form, "notes"),
      next_contact_on: str(form, "next_contact_on") || null,
    });
    if (!result.success) return { success: false, message: t.error };
    if (!agent.countries.includes(result.data.country_code))
      return { success: false, message: t.error };
    const id = str(form, "id");
    const admin = createSupabaseAdminClient();
    const query = id
      ? admin
          .from("sales_contacts")
          .update({ ...result.data, updated_at: new Date().toISOString() })
          .eq("id", uuid.parse(id))
          .eq("agent_id", agent.id)
      : admin
          .from("sales_contacts")
          .insert({ ...result.data, agent_id: agent.id });
    const { data, error } = await query.select("id").maybeSingle();
    if (error?.code === "23505")
      return { success: false, message: t.duplicate };
    if (error || !data) return { success: false, message: t.error };
    refresh();
    return { success: true, message: t.saved };
  } catch {
    return { success: false, message: t.error };
  }
}
