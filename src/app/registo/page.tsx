import RegisterForm from "@/components/auth/RegisterForm";
import { getCurrentLocale } from "@/lib/i18n/server";
import { authCopy } from "@/lib/i18n/account";

export default async function RegisterPage() {
  const locale = await getCurrentLocale(); const t = authCopy[locale];
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6 py-12">
      <section className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
          360 Merchandising
        </p>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-neutral-950">
          {t.createAccount}
        </h1>

        <p className="mt-4 text-sm leading-6 text-neutral-600">
          {t.registerIntro}
        </p>

        <RegisterForm locale={locale} />
      </section>
    </main>
  );
}
