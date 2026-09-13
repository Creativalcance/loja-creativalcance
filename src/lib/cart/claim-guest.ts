import "server-only";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function claimGuestShopping(): Promise<void> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("loja_creativ_cart_session")?.value;
  if (!sessionId) return;
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Sessão inválida. Volta a iniciar sessão.");
  const { data: profile } = await supabase.from("profiles").select("is_active").eq("id", user.id).maybeSingle();
  if (!profile || profile.is_active === false) throw new Error("Conta inativa.");
  // Both identities come from verified server context, never form fields.
  const { error: claimError } = await createSupabaseAdminClient().rpc("claim_guest_shopping", {
    p_user_id: user.id, p_session_id: sessionId,
  });
  if (claimError) throw new Error("Não foi possível recuperar o carrinho. Os artigos foram preservados; tenta novamente.");
}
