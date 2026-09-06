-- CreateTable
CREATE TABLE "Tour" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "cityEn" TEXT,
    "country" TEXT NOT NULL DEFAULT 'ایران',
    "countryEn" TEXT DEFAULT 'Iran',
    "durationDays" INTEGER NOT NULL DEFAULT 3,
    "durationNights" INTEGER NOT NULL DEFAULT 2,
    "price" DECIMAL(18,4) NOT NULL,
    "childPrice" DECIMAL(18,4),
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "reviewsCount" INTEGER NOT NULL DEFAULT 0,
    "category" TEXT NOT NULL DEFAULT 'cultural',
    "heroImage" TEXT,
    "gallery" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "summary" TEXT,
    "summaryEn" TEXT,
    "description" TEXT,
    "descriptionEn" TEXT,
    "highlights" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "includes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "excludes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hotelName" TEXT,
    "hotelStars" INTEGER DEFAULT 5,
    "transportType" TEXT,
    "transportTypeEn" TEXT,
    "groupSize" TEXT,
    "groupSizeEn" TEXT,
    "guideLanguages" TEXT[] DEFAULT ARRAY['فارسی']::TEXT[],
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourDepartureDate" (
    "id" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "price" DECIMAL(18,4) NOT NULL,
    "childPrice" DECIMAL(18,4),
    "availableSeats" INTEGER NOT NULL DEFAULT 10,
    "guaranteed" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TourDepartureDate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourItineraryDay" (
    "id" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "day" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "titleEn" TEXT,
    "description" TEXT NOT NULL,
    "activities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "breakfast" BOOLEAN NOT NULL DEFAULT false,
    "lunch" BOOLEAN NOT NULL DEFAULT false,
    "dinner" BOOLEAN NOT NULL DEFAULT false,
    "accommodation" TEXT,

    CONSTRAINT "TourItineraryDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignatureExperience" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "desc" TEXT NOT NULL,
    "descEn" TEXT NOT NULL,
    "where" TEXT NOT NULL,
    "whereEn" TEXT NOT NULL,
    "when" TEXT NOT NULL,
    "whenEn" TEXT NOT NULL,
    "fromPrice" DECIMAL(18,4) NOT NULL,
    "image" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SignatureExperience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Travelogue" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL DEFAULT 'iran',
    "titleFa" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "destFa" TEXT NOT NULL,
    "destEn" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userAvatar" TEXT,
    "image" TEXT NOT NULL,
    "contentFa" TEXT NOT NULL,
    "contentEn" TEXT NOT NULL,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Travelogue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuideArticle" (
    "id" TEXT NOT NULL,
    "categoryFa" TEXT NOT NULL,
    "categoryEn" TEXT NOT NULL,
    "titleFa" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "readTime" TEXT NOT NULL DEFAULT '۵ دقیقه',
    "excerptFa" TEXT NOT NULL,
    "excerptEn" TEXT NOT NULL,
    "bodyFa" TEXT NOT NULL,
    "bodyEn" TEXT NOT NULL,
    "image" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuideArticle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Tour_category_idx" ON "Tour"("category");
CREATE INDEX "Tour_city_idx" ON "Tour"("city");
CREATE INDEX "Tour_isPublished_idx" ON "Tour"("isPublished");

-- CreateIndex
CREATE INDEX "TourDepartureDate_tourId_idx" ON "TourDepartureDate"("tourId");

-- CreateIndex
CREATE INDEX "TourItineraryDay_tourId_idx" ON "TourItineraryDay"("tourId");

-- CreateIndex
CREATE INDEX "SignatureExperience_countryId_idx" ON "SignatureExperience"("countryId");
CREATE INDEX "SignatureExperience_category_idx" ON "SignatureExperience"("category");
CREATE INDEX "SignatureExperience_isActive_idx" ON "SignatureExperience"("isActive");

-- CreateIndex
CREATE INDEX "Travelogue_countryId_idx" ON "Travelogue"("countryId");
CREATE INDEX "Travelogue_isPublished_idx" ON "Travelogue"("isPublished");

-- CreateIndex
CREATE INDEX "GuideArticle_isPublished_idx" ON "GuideArticle"("isPublished");

-- AddForeignKey
ALTER TABLE "TourDepartureDate" ADD CONSTRAINT "TourDepartureDate_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourItineraryDay" ADD CONSTRAINT "TourItineraryDay_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;
