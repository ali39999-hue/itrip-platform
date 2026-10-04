-- T0501/T0507: Child-owned typed CMS pages with immutable revision history.
CREATE TABLE "BusinessContentPage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'fa',
    "vertical" TEXT NOT NULL DEFAULT 'technology',
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sections" JSONB NOT NULL,
    "seo" JSONB,
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessContentPage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BusinessContentRevision" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "authorId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessContentRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessContentPage_slug_locale_key" ON "BusinessContentPage"("slug", "locale");

-- CreateIndex
CREATE INDEX "BusinessContentPage_status_vertical_idx" ON "BusinessContentPage"("status", "vertical");

-- CreateIndex
CREATE INDEX "BusinessContentPage_scheduledAt_idx" ON "BusinessContentPage"("scheduledAt");

-- CreateIndex
CREATE INDEX "BusinessContentRevision_pageId_createdAt_idx" ON "BusinessContentRevision"("pageId", "createdAt");

-- AddForeignKey
ALTER TABLE "BusinessContentRevision" ADD CONSTRAINT "BusinessContentRevision_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "BusinessContentPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
