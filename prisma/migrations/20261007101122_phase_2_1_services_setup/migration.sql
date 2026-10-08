/*
  Warnings:

  - You are about to drop the column `category` on the `service_masters` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ServiceStoreType" AS ENUM ('NONE', 'MEDICAL', 'GENERAL');

-- CreateEnum
CREATE TYPE "ServiceItemType" AS ENUM ('OPD', 'IPD', 'DAYCARE', 'BOTH', 'PACKAGE');

-- DropIndex
DROP INDEX "service_masters_tenantId_category_idx";

-- AlterTable
ALTER TABLE "opd_bill_items" ADD COLUMN     "serviceId" TEXT;

-- AlterTable
ALTER TABLE "service_masters" DROP COLUMN "category",
ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "discountable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "genderRestriction" "Gender",
ADD COLUMN     "hsnSacCode" TEXT,
ADD COLUMN     "itemType" "ServiceItemType" NOT NULL DEFAULT 'BOTH',
ADD COLUMN     "maxAgeYears" INTEGER,
ADD COLUMN     "minAgeYears" INTEGER,
ADD COLUMN     "rateEditable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "subCategoryId" TEXT,
ADD COLUMN     "uom" TEXT;

-- DropEnum
DROP TYPE "ServiceCategory";

-- CreateTable
CREATE TABLE "service_category_masters" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "storeType" "ServiceStoreType" NOT NULL DEFAULT 'NONE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_category_masters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_sub_categories" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "displayName" TEXT,
    "printOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_sub_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_category_masters_tenantId_idx" ON "service_category_masters"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "service_category_masters_tenantId_code_key" ON "service_category_masters"("tenantId", "code");

-- CreateIndex
CREATE INDEX "service_sub_categories_tenantId_categoryId_idx" ON "service_sub_categories"("tenantId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "service_sub_categories_tenantId_code_key" ON "service_sub_categories"("tenantId", "code");

-- CreateIndex
CREATE INDEX "opd_bill_items_serviceId_idx" ON "opd_bill_items"("serviceId");

-- CreateIndex
CREATE INDEX "service_masters_tenantId_categoryId_idx" ON "service_masters"("tenantId", "categoryId");

-- CreateIndex
CREATE INDEX "service_masters_tenantId_subCategoryId_idx" ON "service_masters"("tenantId", "subCategoryId");

-- AddForeignKey
ALTER TABLE "opd_bill_items" ADD CONSTRAINT "opd_bill_items_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "service_masters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_category_masters" ADD CONSTRAINT "service_category_masters_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_sub_categories" ADD CONSTRAINT "service_sub_categories_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_sub_categories" ADD CONSTRAINT "service_sub_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "service_category_masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_masters" ADD CONSTRAINT "service_masters_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "service_category_masters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_masters" ADD CONSTRAINT "service_masters_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "service_sub_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
