-- Competitor price probe snapshots (best-price-guarantee support;
-- docs/SCRAPING_STATUS_AND_ROADMAP.fa.md). Gated by COMPETITOR_PROBE_ENABLED.

CREATE TABLE "CompetitorPriceSnapshot" (
    "id" TEXT NOT NULL,
    "competitor" TEXT NOT NULL,
    "routeKey" TEXT NOT NULL,
    "originCode" TEXT NOT NULL,
    "destinationCode" TEXT NOT NULL,
    "departureDate" DATE NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IRR',
    "minPrice" DECIMAL(18,2),
    "offersChecked" INTEGER NOT NULL DEFAULT 0,
    "cheapestFlight" TEXT,
    "probedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitorPriceSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CompetitorPriceSnapshot_competitor_routeKey_departureDate_key" ON "CompetitorPriceSnapshot"("competitor", "routeKey", "departureDate");
CREATE INDEX "CompetitorPriceSnapshot_routeKey_departureDate_idx" ON "CompetitorPriceSnapshot"("routeKey", "departureDate");
