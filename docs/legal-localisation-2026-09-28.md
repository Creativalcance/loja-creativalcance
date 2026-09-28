# Legal localisation and password error handling — 28 September 2026

## Scope

Four existing Portuguese documents now have complete English, French, Spanish, German and Italian counterparts. The original Portuguese TXT files remain unchanged. Structured JSON content preserves their headings, clauses, lists, tables and withdrawal forms; PDF line breaks have been repaired for screen reading. The policy version remains 1.0 of 9 September 2026, as in the original pages. This is a translation release, not a change to commercial terms.

Every JSON document records the SHA-256 of its Portuguese source. Tests reject a stale translation revision and check structure, numbers, legal references, contact details, provider names and cookie identifiers across all 24 documents. These checks do not constitute legal certification or prove semantic equivalence on their own.

Translation drafts were machine-assisted using only the existing, unauthenticated public legal texts (each live `/legal/*.txt` response was verified byte-for-byte against the source). Review corrected withdrawal eligibility/exceptions, statutory remedies, refund terminology, data-controller terminology, retention conditions, and provider names. No runtime translation service or new dependency is involved. A qualified legal review remains appropriate before relying on these translations in additional markets. The pre-existing Portuguese-reference clause and mandatory consumer-law protections are preserved.

The legal page reads the selected locale, sets the document language, renders actual tables and lists, and links to the other documents in that locale. Server file tracing explicitly includes all JSON documents. Unknown document names/locales are rejected.

## Password protection

The Supabase organisation is already on Pro. The security advisor still reports `auth_leaked_password_protection` disabled. The available connector cannot update Auth configuration; no SQL changes or alternative password screening service were introduced.

Registration and password change now translate known Supabase `weak_password` errors (including `pwned`) and `same_password` errors in all six languages. Unknown registration errors use the generic localised message. Rejected signup does not claim shopping or send welcome notifications; failed password changes do not activate a sales account. Existing login and shopping recovery behaviour is unchanged.

Pending owner configuration: open the project's Authentication settings, open the email/password provider settings, enable leaked password protection and save. Re-run the security advisor and verify rejected compromised passwords and accepted strong passwords through registration and password recovery in TEST. The local tests simulate the documented provider errors; they do not prove that the provider has been enabled.

Project dashboard: https://supabase.com/dashboard/project/qidoyvhwuvjttoihodvm/auth/providers

## Validation

179 automated tests passed; ESLint reported no errors or warnings; TypeScript and the production build passed. Coverage includes all 24 legal documents and translated password rejection behaviour. Supplier sync, payment setup, order dispatch, database permissions, pricing and shipping rules were not changed.
