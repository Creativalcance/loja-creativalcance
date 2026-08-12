import { LoginForm } from "@/components/auth/LoginForm";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams?: Promise<{
    next?: string;
    registo?: string;
  }>;
};

function getSafeNextPath(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();

  if (!trimmed.startsWith("/")) {
    return undefined;
  }

  if (trimmed.startsWith("//")) {
    return undefined;
  }

  if (trimmed.includes("://")) {
    return undefined;
  }

  return trimmed;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role, is_active").eq("id", user.id).maybeSingle<{ role: string; is_active: boolean }>();
    if (profile?.is_active !== false) redirect(profile?.role === "admin" ? "/admin" : "/area-cliente");
    await supabase.auth.signOut();
  }
  const resolvedSearchParams = await searchParams;
  const nextPath = getSafeNextPath(resolvedSearchParams?.next);
  const registrationSucceeded = resolvedSearchParams?.registo === "sucesso";

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6 py-12">
      <section className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
          360 Merchandising
        </p>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-neutral-950">
          Entrar na plataforma
        </h1>

        <p className="mt-4 text-sm leading-6 text-neutral-600">
          Acede à tua Área de Cliente ou ao backoffice de Administração.
        </p>

        <LoginForm
          nextPath={nextPath}
          registrationSucceeded={registrationSucceeded}
        />
      </section>
    </main>
  );
}
