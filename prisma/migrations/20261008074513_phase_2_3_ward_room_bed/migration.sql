-- CreateEnum
CREATE TYPE "BedStatusType" AS ENUM ('AVAILABLE', 'RESERVED', 'OCCUPIED', 'DISCHARGE_PENDING', 'HOUSEKEEPING', 'MAINTENANCE', 'OUT_OF_SERVICE');

-- CreateEnum
CREATE TYPE "WardGender" AS ENUM ('ANY', 'MALE_ONLY', 'FEMALE_ONLY', 'PEDIATRIC');

-- CreateTable
CREATE TABLE "room_types" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isEmergency" BOOLEAN NOT NULL DEFAULT false,
    "isDaycare" BOOLEAN NOT NULL DEFAULT false,
    "isDialysis" BOOLEAN NOT NULL DEFAULT false,
    "isCount" BOOLEAN NOT NULL DEFAULT true,
    "defaultRate" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "nursingCharge" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "roomNumber" TEXT NOT NULL,
    "floor" TEXT,
    "wing" TEXT,
    "gender" "WardGender" NOT NULL DEFAULT 'ANY',
    "maxBeds" INTEGER NOT NULL DEFAULT 1,
    "hasAC" BOOLEAN NOT NULL DEFAULT false,
    "hasAttachedBath" BOOLEAN NOT NULL DEFAULT false,
    "hasTV" BOOLEAN NOT NULL DEFAULT false,
    "hasOxygen" BOOLEAN NOT NULL DEFAULT false,
    "hasMonitor" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beds" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "bedNumber" TEXT NOT NULL,
    "bedIdentifier" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "beds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bed_statuses" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "bedId" TEXT NOT NULL,
    "status" "BedStatusType" NOT NULL,
    "patientId" TEXT,
    "ipdAdmissionId" TEXT,
    "reservedBy" TEXT,
    "reason" TEXT,
    "changedBy" TEXT,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bed_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bed_amenities" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bed_amenities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_bed_amenities" (
    "roomId" TEXT NOT NULL,
    "amenityId" TEXT NOT NULL,

    CONSTRAINT "room_bed_amenities_pkey" PRIMARY KEY ("roomId","amenityId")
);

-- CreateIndex
CREATE INDEX "room_types_tenantId_idx" ON "room_types"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "room_types_tenantId_code_key" ON "room_types"("tenantId", "code");

-- CreateIndex
CREATE INDEX "rooms_tenantId_roomTypeId_idx" ON "rooms"("tenantId", "roomTypeId");

-- CreateIndex
CREATE INDEX "rooms_tenantId_gender_idx" ON "rooms"("tenantId", "gender");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_tenantId_roomNumber_key" ON "rooms"("tenantId", "roomNumber");

-- CreateIndex
CREATE INDEX "beds_tenantId_roomId_idx" ON "beds"("tenantId", "roomId");

-- CreateIndex
CREATE UNIQUE INDEX "beds_tenantId_bedIdentifier_key" ON "beds"("tenantId", "bedIdentifier");

-- CreateIndex
CREATE UNIQUE INDEX "beds_roomId_bedNumber_key" ON "beds"("roomId", "bedNumber");

-- CreateIndex
CREATE INDEX "bed_statuses_tenantId_bedId_isCurrent_idx" ON "bed_statuses"("tenantId", "bedId", "isCurrent");

-- CreateIndex
CREATE INDEX "bed_statuses_tenantId_status_idx" ON "bed_statuses"("tenantId", "status");

-- CreateIndex
CREATE INDEX "bed_statuses_tenantId_patientId_idx" ON "bed_statuses"("tenantId", "patientId");

-- CreateIndex
CREATE INDEX "bed_amenities_tenantId_idx" ON "bed_amenities"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "bed_amenities_tenantId_code_key" ON "bed_amenities"("tenantId", "code");

-- AddForeignKey
ALTER TABLE "room_types" ADD CONSTRAINT "room_types_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beds" ADD CONSTRAINT "beds_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beds" ADD CONSTRAINT "beds_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bed_statuses" ADD CONSTRAINT "bed_statuses_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bed_statuses" ADD CONSTRAINT "bed_statuses_bedId_fkey" FOREIGN KEY ("bedId") REFERENCES "beds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bed_amenities" ADD CONSTRAINT "bed_amenities_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_bed_amenities" ADD CONSTRAINT "room_bed_amenities_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_bed_amenities" ADD CONSTRAINT "room_bed_amenities_amenityId_fkey" FOREIGN KEY ("amenityId") REFERENCES "bed_amenities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
