import { LoginForm } from "@/components/auth/LoginForm";

type LoginPageProps = {
  searchParams?: Promise<{
    next?: string;
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
  const resolvedSearchParams = await searchParams;
  const nextPath = getSafeNextPath(resolvedSearchParams?.next);

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6 py-12">
      <section className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
          Loja Creativ
        </p>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-neutral-950">
          Entrar na plataforma
        </h1>

        <p className="mt-4 text-sm leading-6 text-neutral-600">
          Acede à tua área cliente, comercial ou administrativa.
        </p>

        <LoginForm nextPath={nextPath} />
      </section>
    </main>
  );
}
