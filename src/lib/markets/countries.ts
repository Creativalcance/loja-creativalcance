// ISO 3166-1 alpha-2 address codes. Address support is not shipping eligibility.
export const COUNTRY_CODES = "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(" ");
const codes = new Set(COUNTRY_CODES);
export function normalizeCountryCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  return codes.has(code) ? code : null;
}
export function countryName(code: string, locale = "pt"): string {
  const normalized = normalizeCountryCode(code);
  if (!normalized) return code;
  return new Intl.DisplayNames([locale], { type: "region" }).of(normalized) || normalized;
}
export function countryOptions(locale = "pt") {
  return COUNTRY_CODES.map(code => ({ code, name: countryName(code, locale) }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
}
export function normalizePortuguesePostalCode(value: string): string | null {
  const compact = value.trim().replace(/[\s-]/g, "");
  if (!/^[1-9]\d{6}$/.test(compact)) return null;
  return `${compact.slice(0, 4)}-${compact.slice(4)}`;
}
