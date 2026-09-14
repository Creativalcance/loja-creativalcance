import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
export type SalesAccountMatch = {
  id: string;
  email: string;
  full_name: string | null;
  role: string | null;
  is_active: boolean;
  confirmed: boolean;
  banned: boolean | null;
  linked_agent_id: string | null;
};
export async function findSalesAccount(
  actorId: string,
  email: string,
): Promise<SalesAccountMatch | null> {
  const admin = createSupabaseAdminClient();
  const actor = await admin
    .from("profiles")
    .select("role,is_active")
    .eq("id", actorId)
    .maybeSingle();
  if (actor.error || actor.data?.role !== "admin" || !actor.data.is_active)
    throw new Error("Sem permissão administrativa.");
  const normalized = email.trim().toLowerCase();
  const match = await admin
    .from("profiles")
    .select("id,full_name,email,role,is_active")
    .eq("email", normalized)
    .maybeSingle();
  if (match.error) throw new Error("Não foi possível verificar a conta.");
  if (!match.data) {
    // The Auth service is authoritative; an existing email without a synchronized profile
    // must never be mistaken for a fresh account or silently reassigned.
    for (let page = 1; ; page++) {
      const result = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (result.error)
        throw new Error("Não foi possível verificar o email registado.");
      if (result.data.users.some((u) => u.email?.toLowerCase() === normalized))
        throw new Error(
          "O email já está registado mas o perfil precisa de ser atualizado em Utilizadores e Contas.",
        );
      if (result.data.users.length < 1000) return null;
    }
  }
  const identity = await admin.auth.admin.getUserById(match.data.id);
  if (
    identity.error ||
    !identity.data.user ||
    identity.data.user.email?.toLowerCase() !== normalized ||
    identity.data.user.is_anonymous
  )
    throw new Error(
      "O email de autenticação difere da ficha. Atualiza a conta em Utilizadores e Contas.",
    );
  const linked = await admin
    .from("sales_agents")
    .select("id")
    .eq("user_id", match.data.id)
    .maybeSingle();
  if (linked.error)
    throw new Error("Não foi possível verificar o acesso comercial.");
  const bannedUntil = (identity.data.user as { banned_until?: string })
    .banned_until;
  return {
    ...match.data,
    confirmed: Boolean(identity.data.user.email_confirmed_at),
    banned: Boolean(bannedUntil && Date.parse(bannedUntil) > Date.now()),
    linked_agent_id: linked.data?.id || null,
  };
}
export function canLinkSalesAccount(
  account: SalesAccountMatch,
  agentId: string,
) {
  return (
    account.is_active &&
    account.confirmed &&
    !account.banned &&
    ["customer", "admin"].includes(account.role || "") &&
    (!account.linked_agent_id || account.linked_agent_id === agentId)
  );
}
