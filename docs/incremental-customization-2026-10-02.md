# Personalization generation performance and incremental updates

The active location cursor and supplier snapshot are preserved. This release
does not restart the source capture or add supplier requests to generation.

## Changes

- Read six normalized identifiers from the local supplier cache, rather than
  transmitting each service's complete raw payload.
- Select the first quantity tier per table code and table option in PostgreSQL.
  The deployed catalogue comparison returned 397 rows instead of 3,962, with
  zero differences in selected table IDs. The customer editor still reads all
  live quantity tiers independently.
- Persist a versioned signature for each successfully processed location. It
  includes location data, variant, product reference, selected component,
  selected pricing records and all official services for that product. Changed
  locations are regenerated; unchanged ones skip option writes and service
  reconciliation. A missing signature always regenerates the location.
- Only save signatures after all option writes and reconciliation succeed.
  Removed supplier services and removed areas become inactive; order references
  and history are retained. A failed batch keeps its durable cursor.
- Compare and upsert at most 100 generated options in one database operation.
  The conditional update leaves unchanged rows (and their updated_at) intact,
  rejects mixed suppliers and returns the actual write count. This removes the
  per-chunk HTTP read and broad cross-product variant/service filters. Verified
  under service_role in a rolled-back transaction: identical input writes zero,
  a changed price writes one, and supplier/size violations are rejected.
- Increase batches from 25 to 50 and then at most 100 only after two executions
  under eight seconds. Reduce the batch after an execution over fifteen seconds
  or a failure. Keep the two-minute cron, adaptive rest and ten-minute error
  backoff. Store timings for each processing phase in the import history.
- A catalogue-wide signature can bypass a wholly unchanged future cycle only
  when a previous complete cycle certified the same signature. Start and finish
  signatures must match. The guard is optional, has a ten-second client timeout,
  and falls back to bounded location comparisons if unavailable. Covering indexes
  avoid reading large payloads for this check; first measured execution fell from
  75.7 seconds to 7.4 seconds. It runs at cycle boundaries, not for every batch.

## Initial baseline and rollback

Locations processed before this deployment have no trustworthy stored signature.
They receive their first signature on their next successful visit. The running
legacy job cannot certify a catalogue-wide signature for previously processed
locations; it continues from its existing cursor. Never initialize signatures by
assuming an existing output is correct.

Bump CUSTOMIZATION_GENERATION_VERSION whenever generation or reconciliation
rules change. The forceRegenerate batch parameter bypasses existing location
signatures for explicit repairs.

Rollback the application commit first. The new state table and functions are
worker-only (RLS enabled; no anon/authenticated access) and can remain in place.
Removing them later does not remove products, prices, options or order history.

## Verification

Regression coverage includes unchanged reruns, changed price/geometry, removed
services and areas, partial write failure, catalogue changes during a cycle,
unavailable global checks, bounded adaptive batches, pagination and editor data
equivalence. Supplier test/live and payment configuration are unchanged.
