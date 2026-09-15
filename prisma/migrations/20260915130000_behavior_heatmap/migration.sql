-- CreateTable
CREATE TABLE "BehaviorEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "anonymousId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "locale" TEXT,
    "xPct" DOUBLE PRECISION,
    "yPct" DOUBLE PRECISION,
    "scrollPct" INTEGER,
    "selector" TEXT,
    "viewportW" INTEGER,
    "viewportH" INTEGER,
    "device" TEXT,
    "props" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BehaviorEvent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BehaviorEvent" ADD CONSTRAINT "BehaviorEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "BehaviorEvent_userId_createdAt_idx" ON "BehaviorEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "BehaviorEvent_route_createdAt_idx" ON "BehaviorEvent"("route", "createdAt");

-- CreateIndex
CREATE INDEX "BehaviorEvent_sessionId_createdAt_idx" ON "BehaviorEvent"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "BehaviorEvent_type_createdAt_idx" ON "BehaviorEvent"("type", "createdAt");

-- CreateIndex
CREATE INDEX "BehaviorEvent_createdAt_idx" ON "BehaviorEvent"("createdAt");
