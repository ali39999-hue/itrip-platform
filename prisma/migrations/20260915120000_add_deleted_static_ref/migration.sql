-- CreateTable
CREATE TABLE "DeletedStaticRef" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeletedStaticRef_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeletedStaticRef_kind_refId_key" ON "DeletedStaticRef"("kind", "refId");

-- CreateIndex
CREATE INDEX "DeletedStaticRef_kind_idx" ON "DeletedStaticRef"("kind");
