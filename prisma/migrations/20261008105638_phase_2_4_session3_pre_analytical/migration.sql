-- CreateEnum
CREATE TYPE "StorageTemperature" AS ENUM ('ROOM_TEMPERATURE', 'REFRIGERATED', 'FROZEN', 'DEEP_FROZEN');

-- AlterTable
ALTER TABLE "investigations" ADD COLUMN     "sampleContainerId" TEXT,
ADD COLUMN     "sampleTypeId" TEXT;

-- CreateTable
CREATE TABLE "sample_container_masters" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "capColor" TEXT NOT NULL,
    "hexColorCode" TEXT,
    "additive" TEXT,
    "defaultVolumeMl" DECIMAL(4,2),
    "tubeType" TEXT NOT NULL DEFAULT 'VACUTAINER',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sample_container_masters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sample_types" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "defaultContainerId" TEXT,
    "minVolumeMl" DECIMAL(4,2),
    "storageTemp" "StorageTemperature" NOT NULL DEFAULT 'REFRIGERATED',
    "stabilityRoomTempHours" INTEGER DEFAULT 4,
    "stabilityFridgeHours" INTEGER DEFAULT 24,
    "stabilityFrozenDays" INTEGER DEFAULT 30,
    "archiveDays" INTEGER NOT NULL DEFAULT 2,
    "collectionInstructions" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sample_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sample_container_masters_tenantId_idx" ON "sample_container_masters"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "sample_container_masters_tenantId_code_key" ON "sample_container_masters"("tenantId", "code");

-- CreateIndex
CREATE INDEX "sample_types_tenantId_idx" ON "sample_types"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "sample_types_tenantId_code_key" ON "sample_types"("tenantId", "code");

-- AddForeignKey
ALTER TABLE "investigations" ADD CONSTRAINT "investigations_sampleTypeId_fkey" FOREIGN KEY ("sampleTypeId") REFERENCES "sample_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigations" ADD CONSTRAINT "investigations_sampleContainerId_fkey" FOREIGN KEY ("sampleContainerId") REFERENCES "sample_container_masters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sample_container_masters" ADD CONSTRAINT "sample_container_masters_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sample_types" ADD CONSTRAINT "sample_types_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sample_types" ADD CONSTRAINT "sample_types_defaultContainerId_fkey" FOREIGN KEY ("defaultContainerId") REFERENCES "sample_container_masters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
