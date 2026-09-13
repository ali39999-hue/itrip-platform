-- Parto CRS live flight-offer cache (docs/PARTO_LIVE_INTEGRATION_PLAN.fa.md)

CREATE TABLE "FlightOfferCache" (
    "id" TEXT NOT NULL,
    "supplierCode" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "fareSourceCode" TEXT NOT NULL,
    "routeKey" TEXT NOT NULL,
    "originCode" TEXT NOT NULL,
    "destinationCode" TEXT NOT NULL,
    "departureDate" DATE NOT NULL,
    "departureTime" TIMESTAMP(3) NOT NULL,
    "arrivalTime" TIMESTAMP(3) NOT NULL,
    "airlineCode" TEXT NOT NULL,
    "airlineName" TEXT NOT NULL,
    "flightNumber" TEXT NOT NULL,
    "cabinClass" TEXT NOT NULL DEFAULT 'ECONOMY',
    "stops" INTEGER NOT NULL DEFAULT 0,
    "seatsRemaining" INTEGER NOT NULL DEFAULT 9,
    "baseFare" DECIMAL(18,2) NOT NULL,
    "totalFare" DECIMAL(18,2) NOT NULL,
    "totalTax" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'IRR',
    "baggage" TEXT,
    "isCharter" BOOLEAN NOT NULL DEFAULT false,
    "refundable" BOOLEAN NOT NULL DEFAULT true,
    "ticketType" TEXT NOT NULL DEFAULT 'systemic',
    "durationMinutes" INTEGER,
    "terminals" JSONB,
    "rawJson" JSONB,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlightOfferCache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FlightOfferCache_offerId_key" ON "FlightOfferCache"("offerId");
CREATE UNIQUE INDEX "FlightOfferCache_supplierCode_fareSourceCode_departureDate_key" ON "FlightOfferCache"("supplierCode", "fareSourceCode", "departureDate");
CREATE INDEX "FlightOfferCache_routeKey_departureDate_fetchedAt_idx" ON "FlightOfferCache"("routeKey", "departureDate", "fetchedAt");
CREATE INDEX "FlightOfferCache_expiresAt_idx" ON "FlightOfferCache"("expiresAt");

CREATE TABLE "FlightRouteDemand" (
    "id" TEXT NOT NULL,
    "routeKey" TEXT NOT NULL,
    "originCode" TEXT NOT NULL,
    "destinationCode" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "lookAheadDays" INTEGER NOT NULL DEFAULT 3,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastRefreshedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "lastErrorAt" TIMESTAMP(3),
    "refreshCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlightRouteDemand_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FlightRouteDemand_routeKey_key" ON "FlightRouteDemand"("routeKey");
CREATE INDEX "FlightRouteDemand_enabled_priority_idx" ON "FlightRouteDemand"("enabled", "priority");
