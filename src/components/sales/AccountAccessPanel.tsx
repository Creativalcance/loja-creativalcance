"use client";
import type { SalesAgent } from "@/lib/sales/types";
import type { SalesAccountMatch } from "@/lib/sales/account";
import { inviteAgentAction } from "@/lib/sales/actions";
import { useAgentEdits } from "./AgentEditContext";
import SalesActionForm from "./ActionForm";
export default function AccountAccessPanel({
  agent,
  account,
  lookupError,
}: {
  agent: SalesAgent;
  account: SalesAccountMatch | null;
  lookupError?: string;
}) {
  const { dirty } = useAgentEdits();
  const eligible =
    account &&
    account.is_active &&
    account.confirmed &&
    !account.banned &&
    ["customer", "admin"].includes(account.role || "") &&
    (!account.linked_agent_id || account.linked_agent_id === agent.id);
  const infoOnly = Boolean(
    agent.user_id &&
      (agent.account_kind === "existing_account" || agent.status === "active"),
  );
  const disabled =
    dirty ||
    Boolean(lookupError) ||
    agent.status === "suspended" ||
    (!agent.user_id && Boolean(account) && !eligible);
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
        <p className="text-xs text-slate-500">Email guardado na ficha</p>
        <p className="mt-1 break-all font-semibold">{agent.email}</p>
        {account ? (
          <>
            <p className="mt-3">{account.full_name || "Conta registada"}</p>
            <p className="text-slate-500">
              {account.role === "admin" ? "Administrador" : "Cliente"} ·{" "}
              {agent.user_id ? "Conta associada" : "Conta existente encontrada"}
            </p>
          </>
        ) : !agent.user_id && !lookupError ? (
          <p className="mt-3 text-slate-500">
            Ainda não existe uma conta com este email.
          </p>
        ) : null}
      </div>
      <p className="text-sm leading-6 text-slate-600">
        {infoOnly || account
          ? "O módulo comercial é acrescentado à conta. A palavra-passe e os acessos atuais mantêm-se. O email inclui a ligação para entrar na área comercial."
          : "Será criada uma conta de cliente com acesso comercial. O convite permite definir a palavra-passe."}
      </p>
      {dirty && (
        <p
          role="status"
          className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900"
        >
          Guarda primeiro as alterações à ficha. Depois confirma a conta
          apresentada aqui.
        </p>
      )}
      {lookupError && (
        <p role="alert" className="text-sm text-red-700">
          {lookupError}
        </p>
      )}
      {!agent.user_id && account && !eligible && (
        <p role="alert" className="text-sm text-amber-900">
          A conta deve estar ativa, ter o email confirmado e não estar associada
          a outro comercial.
        </p>
      )}
      {agent.status === "suspended" && (
        <p className="text-sm text-amber-900">
          O módulo comercial está suspenso. A conta de cliente mantém o seu
          estado.
        </p>
      )}
      <SalesActionForm
        action={inviteAgentAction}
        disabled={disabled}
        pendingText="A processar…"
        submit={
          infoOnly
            ? "Verificar envio do email de acesso"
            : agent.user_id
              ? "Reenviar convite"
              : account
                ? "Associar conta e ativar acesso comercial"
                : "Criar conta e enviar convite"
        }
      >
        <input type="hidden" name="agent_id" value={agent.id} />
        <input type="hidden" name="expected_email" value={agent.email} />
        <input
          type="hidden"
          name="expected_updated_at"
          value={agent.updated_at}
        />
        <input
          type="hidden"
          name="existing_user_id"
          value={account?.id || ""}
        />
        <input
          type="hidden"
          name="account_mode"
          value={account ? "existing" : "new"}
        />
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="confirm_account"
            required
            className="mt-1 accent-orange-600"
          />
          <span>
            Confirmo a conta{" "}
            <strong className="break-all">{agent.email}</strong>.
          </span>
        </label>
      </SalesActionForm>
      {agent.invitation_sent_at && (
        <p className="text-xs text-slate-500">
          Último email:{" "}
          {new Date(agent.invitation_sent_at).toLocaleString("pt-PT")}
        </p>
      )}
      {agent.invitation_error && (
        <p className="text-sm text-amber-800">{agent.invitation_error}</p>
      )}
    </div>
  );
}
