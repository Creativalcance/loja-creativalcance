# Prelaunch corrections — 28 September 2026

## Implemented

- Next.js and eslint-config-next 16.3.6; compatible dependency security updates. npm audit reported zero known vulnerabilities after install.
- Direct anon/authenticated writes revoked on carts, cart items, customization drafts, orders, order items, payments and checkout sessions. Existing SELECT/RLS remains; server actions and webhooks use service_role and ownership/admin checks.
- Checkout verifies catalogue prices, customization prices, extras, minimum quantities, currency, discount and arithmetic before creating payment. Changed carts require customer review by removing/re-adding items.
- Customization extras calculated on server from selected services (21 EUR design, 15 EUR extra proof, 0.70 EUR/unit nominative), ignoring submitted totals.
- Add-to-cart and checkout check stock across all lines sharing a variant. Expired forecasts are excluded from orderable quantities; future stock is still allowed as before. This is a point-in-time check, not an inventory reservation or guarantee against concurrent sales/provider stock changes.
- Supplier price upsert explicitly supplies required pricing modes and override booleans, preserves manual overrides and uses defaultToNull:false for mixed rows. Supplier color sync spaces languages by 10 seconds; rate-limit responses get bounded retries.
- Anonymous quotation submissions saved by server; validated fields, localized status messages, generic technical failure text and compensating cleanup when item insertion fails. This does not add quotation email delivery.
- Removed redundant React effect state updates; cancelled stale image recoloring callbacks. Restored missing createClient import in legacy Edge Function source; did not deploy that legacy function.
- Localized legal/contact metadata, headings and quote phone label. Legal body explicitly marked Portuguese and language availability explained in other locales. Full legal translations still pending review.
- Fixed search_path for seven database functions; revoked direct client execution of supplier status trigger function.
- Deactivated only SKU 360-PRODUCTS-2026 / produto-teste-1 (retained record and order history).

## Validation

- TypeScript and production build pass.
- Existing test suite plus regression tests for manipulated prices, anonymous quotations, cumulative variant stock, expired forecasts and mixed manual/automatic customization pricing batches.
- ESLint: zero errors, 23 existing warnings (primarily image optimization and dependencies/unused values).
- Database: no remaining direct client write grants on seven financial tables; service_role retains writes; all seven targeted functions have fixed paths.

## Remaining launch checks

- Confirm a fresh successful supplier customization-table and all-language color synchronization in the deployed environment. Retry/backoff does not guarantee supplier availability.
- Auth leaked-password protection remains disabled; enable and verify in Supabase Auth settings. No configuration write API was available in the current connected tool set.
- pg_trgm remains in public to avoid unverified search/index dependency changes. is_admin remains callable for authenticated users by design; 17 server-only RLS tables have no client policies by design.
- Full legal translations require review; no legal terms or tax eligibility expansion made.
- Complete authenticated browser checkout/artwork/admin order review and a controlled Stripe TEST transaction before live activation. Local browser automation was unavailable during the preceding audit; passing unit tests/HTTP responses do not substitute for these checks.
- Payments and supplier orders remain in their existing TEST configuration. No customer emails, real payments or provider orders were created during this correction work.

## Rollback

Revert the code commit through a new deployment if needed. Keep financial write restrictions: reverting them restores the identified trust vulnerability. Previous server actions already use service_role for these writes. The test product can be reactivated explicitly if required. Function search_path changes preserve current referenced objects and need no code dependency.
