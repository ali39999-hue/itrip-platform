-- Booking.travelDate: queryable primary travel date (audit TZ/date item).
-- Backfilled from each booking's item details snapshot, which has carried the
-- travel date since draft creation (details is app-generated JSON).

ALTER TABLE "Booking" ADD COLUMN "travelDate" TEXT;

UPDATE "Booking" b
SET "travelDate" = NULLIF(
  jsonb_extract_path_text(it."details"::jsonb, 'travelDate'),
  ''
)
FROM "BookingItem" it
WHERE it."bookingId" = b."id"
  AND it."details" LIKE '%"travelDate"%';

CREATE INDEX "Booking_travelDate_idx" ON "Booking"("travelDate");
