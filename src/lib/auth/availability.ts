import type { SiteLocale } from "@/lib/i18n/config";

export function isAuthUnavailable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as { status?: number; name?: string };
  return value.name === "AuthRetryableFetchError" || value.name === "AbortError" ||
    value.name === "TimeoutError" || value.status === 0 || value.status === 429 ||
    (typeof value.status === "number" && value.status >= 500);
}

export const authUnavailableMessage: Record<SiteLocale, string> = {
  pt: "Não foi possível contactar o serviço de autenticação. Tenta novamente dentro de alguns instantes.",
  en: "The authentication service could not be reached. Please try again in a moment.",
  fr: "Le service d’authentification est momentanément inaccessible. Veuillez réessayer dans quelques instants.",
  es: "No se ha podido contactar con el servicio de autenticación. Inténtalo de nuevo en unos instantes.",
  de: "Der Anmeldedienst ist momentan nicht erreichbar. Bitte versuchen Sie es gleich erneut.",
  it: "Il servizio di autenticazione non è al momento raggiungibile. Riprova tra qualche istante.",
};
