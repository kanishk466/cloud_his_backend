-- CreateEnum
CREATE TYPE "DocumentApplicableFor" AS ENUM ('OPD', 'IPD', 'BOTH');

-- CreateTable
CREATE TABLE "countries" (
    "id" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "countryName" TEXT NOT NULL,
    "currency" TEXT,
    "currencySymbol" TEXT,
    "isBaseCurrency" BOOLEAN NOT NULL DEFAULT false,
    "phoneCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "states" (
    "id" TEXT NOT NULL,
    "stateCode" TEXT NOT NULL,
    "stateName" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "districts" (
    "id" TEXT NOT NULL,
    "districtCode" TEXT NOT NULL,
    "districtName" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "districts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cities" (
    "id" TEXT NOT NULL,
    "cityCode" TEXT NOT NULL,
    "cityName" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banks" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "mdrPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "banks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_document_types" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentName" TEXT NOT NULL,
    "isMandatory" BOOLEAN NOT NULL DEFAULT false,
    "applicableFor" "DocumentApplicableFor" NOT NULL DEFAULT 'BOTH',
    "allowedFileTypes" TEXT[] DEFAULT ARRAY['pdf', 'jpg', 'jpeg', 'png']::TEXT[],
    "maxFileSizeMB" INTEGER NOT NULL DEFAULT 5,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "patient_document_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "countries_countryCode_key" ON "countries"("countryCode");

-- CreateIndex
CREATE INDEX "countries_isActive_idx" ON "countries"("isActive");

-- CreateIndex
CREATE INDEX "countries_countryCode_idx" ON "countries"("countryCode");

-- CreateIndex
CREATE INDEX "states_countryId_idx" ON "states"("countryId");

-- CreateIndex
CREATE INDEX "states_countryId_isActive_idx" ON "states"("countryId", "isActive");

-- CreateIndex
CREATE INDEX "states_isActive_idx" ON "states"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "states_countryId_stateCode_key" ON "states"("countryId", "stateCode");

-- CreateIndex
CREATE INDEX "districts_stateId_idx" ON "districts"("stateId");

-- CreateIndex
CREATE INDEX "districts_stateId_isActive_idx" ON "districts"("stateId", "isActive");

-- CreateIndex
CREATE INDEX "districts_isActive_idx" ON "districts"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "districts_stateId_districtCode_key" ON "districts"("stateId", "districtCode");

-- CreateIndex
CREATE INDEX "cities_districtId_idx" ON "cities"("districtId");

-- CreateIndex
CREATE INDEX "cities_districtId_isActive_idx" ON "cities"("districtId", "isActive");

-- CreateIndex
CREATE INDEX "cities_isActive_idx" ON "cities"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "cities_districtId_cityCode_key" ON "cities"("districtId", "cityCode");

-- CreateIndex
CREATE INDEX "banks_tenantId_idx" ON "banks"("tenantId");

-- CreateIndex
CREATE INDEX "banks_tenantId_deletedAt_idx" ON "banks"("tenantId", "deletedAt");

-- CreateIndex
CREATE INDEX "banks_tenantId_isActive_idx" ON "banks"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "banks_tenantId_bankName_key" ON "banks"("tenantId", "bankName");

-- CreateIndex
CREATE INDEX "patient_document_types_tenantId_idx" ON "patient_document_types"("tenantId");

-- CreateIndex
CREATE INDEX "patient_document_types_tenantId_deletedAt_idx" ON "patient_document_types"("tenantId", "deletedAt");

-- CreateIndex
CREATE INDEX "patient_document_types_tenantId_isActive_idx" ON "patient_document_types"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "patient_document_types_tenantId_applicableFor_idx" ON "patient_document_types"("tenantId", "applicableFor");

-- CreateIndex
CREATE UNIQUE INDEX "patient_document_types_tenantId_documentName_key" ON "patient_document_types"("tenantId", "documentName");

-- AddForeignKey
ALTER TABLE "states" ADD CONSTRAINT "states_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "districts" ADD CONSTRAINT "districts_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "states"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cities" ADD CONSTRAINT "cities_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "banks" ADD CONSTRAINT "banks_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_document_types" ADD CONSTRAINT "patient_document_types_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
