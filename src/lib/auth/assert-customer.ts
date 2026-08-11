import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function assertCustomerAccess(nextPath = "/area-cliente") {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  const { data: profile } = await supabase.from("profiles").select("role, is_active").eq("id", user.id).maybeSingle<{role:string;is_active:boolean}>();
  if (!profile || profile.is_active === false) redirect("/logout");
  if (profile.role !== "customer") redirect(profile.role === "admin" ? "/admin" : "/");
  return { user, profile, supabase };
}
