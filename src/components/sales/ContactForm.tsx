import { saveSalesContactAction } from "@/lib/sales/actions";
import { salesCopy, countryName } from "@/lib/sales/i18n";
import type { SalesAgent, SalesContact } from "@/lib/sales/types";
import SalesActionForm from "./ActionForm";
import { Field, inputClass } from "./Fields";
export default function ContactForm({
  agent,
  contact,
}: {
  agent: SalesAgent;
  contact?: SalesContact;
}) {
  const t = salesCopy(agent.locale);
  return (
    <SalesActionForm
      action={saveSalesContactAction}
      submit={t.save}
      pendingText={t.saving}
    >
      <input type="hidden" name="id" value={contact?.id || ""} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.name} name="name" value={contact?.name} required />
        <Field
          label={t.email}
          name="email"
          type="email"
          value={contact?.email}
          required
        />
        <Field label={t.phone} name="phone" value={contact?.phone} />
        <Field
          label={t.company}
          name="company_name"
          value={contact?.company_name}
        />
        <label className="text-sm font-medium">
          {t.country}
          <select
            className={inputClass}
            name="country_code"
            defaultValue={contact?.country_code || agent.countries[0]}
          >
            {agent.countries.map((c) => (
              <option key={c} value={c}>
                {countryName(c, agent.locale)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          {t.stage}
          <select
            className={inputClass}
            name="stage"
            defaultValue={contact?.stage || "new"}
          >
            {(
              [
                "new",
                "contacted",
                "qualified",
                "proposal",
                "won",
                "lost",
              ] as const
            ).map((s) => (
              <option key={s} value={s}>
                {t[s]}
              </option>
            ))}
          </select>
        </label>
        <Field
          label={t.nextContact}
          name="next_contact_on"
          type="date"
          value={contact?.next_contact_on || ""}
        />
      </div>
      <label className="block text-sm font-medium">
        {t.notes}
        <textarea
          className={inputClass}
          name="notes"
          maxLength={5000}
          rows={3}
          defaultValue={contact?.notes || ""}
        />
      </label>
    </SalesActionForm>
  );
}
