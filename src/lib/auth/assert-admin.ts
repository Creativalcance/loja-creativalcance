import { createSupabaseServerClient } from "@/lib/supabase/server";

type Profile = {
  role: string;
};

export async function assertAdminAccess(): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Sessão inválida.");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (error) {
    throw new Error(error.message);
  }

  if (!profile || !["admin", "super_admin", "sales"].includes(profile.role)) {
    throw new Error("Sem permissões para executar esta acção.");
  }
}