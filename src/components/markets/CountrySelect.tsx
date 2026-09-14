import type { SelectHTMLAttributes } from "react";
import { countryOptions } from "@/lib/markets/countries";
export default function CountrySelect({ locale, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { locale: string }) {
  return <select autoComplete="country" required {...props}>{countryOptions(locale).map(({ code, name }) => <option key={code} value={code}>{name}</option>)}</select>;
}
