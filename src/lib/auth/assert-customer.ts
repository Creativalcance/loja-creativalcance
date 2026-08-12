import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function assertCustomerAccess(nextPath = "/area-cliente") {
  const supabase = await createSupabaseServerClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null;

  if (claimsError || !userId) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const claims = claimsData?.claims;
  const user = {
    id: userId,
    email: typeof claims?.email === "string" ? claims.email : undefined,
  };

  const { data: profile } = await supabase.from("profiles").select("role, is_active").eq("id", userId).maybeSingle<{role:string;is_active:boolean}>();
  if (!profile || profile.is_active === false) redirect("/logout");
  if (profile.role !== "customer") redirect(profile.role === "admin" ? "/admin" : "/");
  return { user, profile, supabase };
}
