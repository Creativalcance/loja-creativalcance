import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AdminProfile = {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
};

export type AdminAccessResult = {
  userId: string;
  email: string;
  profile: AdminProfile;
};

const ADMIN_ROLES = new Set([
  "admin",
  "super_admin",
  "sales",
]);

function getSafeNextPath(value: string): string {
  const trimmed = value.trim();

  if (!trimmed.startsWith("/")) {
    return "/admin";
  }

  if (trimmed.startsWith("//")) {
    return "/admin";
  }

  if (trimmed.includes("://")) {
    return "/admin";
  }

  return trimmed || "/admin";
}

function buildLoginUrl(nextPath: string): string {
  const safeNextPath = getSafeNextPath(nextPath);

  return `/login?next=${encodeURIComponent(safeNextPath)}`;
}

export async function assertAdminAccess(
  nextPath = "/admin",
): Promise<AdminAccessResult> {
  const safeNextPath = getSafeNextPath(nextPath);
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect(buildLoginUrl(safeNextPath));
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      `
        id,
        full_name,
        email,
        role
      `,
    )
    .eq("id", user.id)
    .maybeSingle<AdminProfile>();

  if (profileError) {
    throw new Error(
      `Não foi possível validar as permissões administrativas: ${profileError.message}`,
    );
  }

  if (!profile) {
    redirect("/?erro=perfil-administrativo-nao-encontrado");
  }

  if (!ADMIN_ROLES.has(profile.role)) {
    redirect("/?erro=sem-permissao-administrativa");
  }

  return {
    userId: user.id,
    email: user.email ?? profile.email,
    profile,
  };
}