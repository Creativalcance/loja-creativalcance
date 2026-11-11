import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAuthUnavailable } from "@/lib/auth/availability";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", "Vercel-CDN-Cache-Control": "no-store" };

// Count cart lines, not bulk units: 100 pens and one hamper are two articles.
// Never accept a cart/user/session identifier from request parameters.
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (isAuthUnavailable(authError)) throw new Error("Authentication unavailable");
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("loja_creativ_cart_session")?.value;
    if (!user && (!sessionId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId))) {
      return Response.json({ count: 0 }, { headers });
    }

    const admin = createSupabaseAdminClient();
    const query = admin.from("carts").select("id").eq("status", "active").limit(1).abortSignal(AbortSignal.timeout(4000));
    const { data: cart, error: cartError } = user
      ? await query.eq("user_id", user.id).maybeSingle()
      : await query.eq("session_id", sessionId!).is("user_id", null).maybeSingle();
    if (cartError) throw new Error("Cart unavailable");
    if (!cart) return Response.json({ count: 0 }, { headers });

    const { count, error } = await admin.from("cart_items")
      .select("id", { count: "exact", head: true }).eq("cart_id", cart.id).abortSignal(AbortSignal.timeout(4000));
    if (error || count === null) throw new Error("Cart count unavailable");
    return Response.json({ count }, { headers });
  } catch {
    // An outage must not present an existing cart as empty or expose internal errors.
    return Response.json({ error: "Cart count unavailable" }, { status: 503, headers });
  }
}
