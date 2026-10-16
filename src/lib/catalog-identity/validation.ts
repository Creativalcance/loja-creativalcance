import { z } from "zod";
export const identityLocales = ["pt", "en", "fr", "es", "de", "it"] as const;
export const identityLanguageLabels = { pt: "Português", en: "Inglês", fr: "Francês", es: "Espanhol", de: "Alemão", it: "Italiano" };
const plain = (max: number) => z.string().trim().max(max).refine(value => !/[<>\u0000-\u0008]/.test(value), "Utiliza texto simples, sem HTML.");
const translation = z.object({ name: plain(180), description: plain(6000) }).strict();
export const identityInput = z.object({
  productId: z.string().uuid(), version: z.coerce.number().int().positive(),
  reviewStatus: z.enum(["draft", "ready"]),
  translations: z.object({ pt: translation, en: translation, fr: translation, es: translation, de: translation, it: translation }).strict(),
}).strict().superRefine((value, ctx) => {
  if (value.reviewStatus === "ready") for (const locale of identityLocales) {
    if (value.translations[locale].name.length < 3) ctx.addIssue({ code: "custom", path: ["translations", locale, "name"], message: "Preenche o nome nos seis idiomas antes de marcar como revisto." });
  }
});
export function readIdentityForm(form: FormData) {
  return identityInput.safeParse({ productId: form.get("productId"), version: form.get("version"), reviewStatus: form.get("reviewStatus"),
    translations: Object.fromEntries(identityLocales.map(locale => [locale, {
      name: form.get(`${locale}.name`) ?? "", description: form.get(`${locale}.description`) ?? "",
    }])) });
}
export type IdentityTranslations = z.infer<typeof identityInput>["translations"];
export type IdentityFormState = { error?: string; saved?: boolean };
