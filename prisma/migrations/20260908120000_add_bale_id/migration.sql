-- AlterTable
ALTER TABLE "User" ADD COLUMN     "baleId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_baleId_key" ON "User"("baleId");
