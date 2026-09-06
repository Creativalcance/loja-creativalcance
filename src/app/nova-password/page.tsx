import UpdatePasswordForm from "./UpdatePasswordForm";
import { getCurrentLocale } from "@/lib/i18n/server";
import { authCopy } from "@/lib/i18n/account";
export default async function NewPasswordPage(){const locale=await getCurrentLocale(); const t=authCopy[locale]; return <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6 py-12"><section className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm"><h1 className="text-3xl font-semibold">{t.newPasswordTitle}</h1><UpdatePasswordForm locale={locale}/></section></main>}
