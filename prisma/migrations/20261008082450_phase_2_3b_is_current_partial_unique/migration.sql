-- Phase 2.3B — Defense-in-depth for the bed-status state machine.
--
-- The application guarantees "one current BedStatus per bed" transactionally
-- (close old row + open new row in a single $transaction). This partial
-- unique index enforces the same invariant at the DATABASE level, so a bug
-- or manual SQL edit can never leave a bed with two live statuses.

CREATE UNIQUE INDEX "bed_statuses_one_current_per_bed"
ON "bed_statuses" ("bedId")
WHERE "isCurrent" = true;
