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
  or a failure. Store timings for each processing phase in the import history.
- Run the worker every minute, processing up to four sequential batches while
  the predicted next batch fits within a twenty-second work budget. This is a
  scheduling budget, not a timeout on an in-flight database write. Save the
  cursor after every successful batch. A slow batch ends the burst, shrinks the
  next batch and rests at least a minute; an error still backs off ten minutes.
  The existing common lock prevents overlapping workers and supplier imports.
- Cover reconciliation's active-option identifiers with a partial index, so
  each page no longer loads thousands of wide heap rows just to check service
  codes. Existing values and reconciliation rules remain unchanged.
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
equivalence. Burst tests cover the time and batch-count limits, cancellation,
checkpoint persistence after a later failure, cooldown and slow-batch backoff.
Supplier test/live and payment configuration are unchanged.

## Throughput correction, 15:00 UTC

The first incremental release still completed only 750 locations in the hour
before 14:55 UTC. The combination of repeated reconciliation heap reads and
one batch per two-minute tick left an unacceptable remaining duration.

An actual reconciliation plan before the covering index took 3,894.7 ms and
read 2,006 disk blocks. The follow-up used the covering index, took 630.1 ms
and read 84 blocks. These are observed samples, not a fixed speed guarantee;
the live worker continued updating its catalogue between measurements.

The revised schedule addresses idle time while retaining sequential execution,
small writes, checkpoints and automatic backoff. The captured supplier snapshot
and existing location cursor are reused. No additional supplier requests are
needed for these local batches.
