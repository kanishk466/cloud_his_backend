CREATE TYPE "WardGenderRestriction" AS ENUM ('ANY', 'MALE', 'FEMALE', 'PEDIATRIC');
CREATE TYPE "BedCurrentStatus" AS ENUM ('VACANT', 'OCCUPIED', 'CLEANING', 'RESERVED', 'MAINTENANCE');

CREATE TABLE "room_types" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT,
    "description" TEXT,
    "selfBillingCategory" BOOLEAN NOT NULL DEFAULT false,
    "billingCategory" TEXT,
    "isEmergency" BOOLEAN NOT NULL DEFAULT false,
    "isDialysis" BOOLEAN NOT NULL DEFAULT false,
    "isDaycare" BOOLEAN NOT NULL DEFAULT false,
    "isDiscountable" BOOLEAN NOT NULL DEFAULT true,
    "genderRestriction" "WardGenderRestriction" NOT NULL DEFAULT 'ANY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    CONSTRAINT "room_types_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "floorName" TEXT,
    "roomName" TEXT NOT NULL,
    "roomNo" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "beds" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "bedNo" TEXT NOT NULL,
    "description" TEXT,
    "isCount" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    CONSTRAINT "beds_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bed_statuses" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "bedId" TEXT NOT NULL,
    "currentStatus" "BedCurrentStatus" NOT NULL DEFAULT 'VACANT',
    "patientId" TEXT,
    "admissionId" TEXT,
    "statusChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statusChangedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "bed_statuses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bed_amenities" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    CONSTRAINT "bed_amenities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bed_amenity_mappings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "bedId" TEXT NOT NULL,
    "amenityId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "bed_amenity_mappings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "room_types_tenantId_name_key" ON "room_types"("tenantId", "name");
CREATE UNIQUE INDEX "room_types_tenantId_id_key" ON "room_types"("tenantId", "id");
CREATE INDEX "room_types_tenantId_deletedAt_isActive_idx" ON "room_types"("tenantId", "deletedAt", "isActive");
CREATE UNIQUE INDEX "rooms_tenantId_id_key" ON "rooms"("tenantId", "id");
CREATE UNIQUE INDEX "rooms_tenantId_floorName_roomNo_key" ON "rooms"("tenantId", "floorName", "roomNo");
CREATE INDEX "rooms_tenantId_roomTypeId_deletedAt_isActive_idx" ON "rooms"("tenantId", "roomTypeId", "deletedAt", "isActive");
CREATE UNIQUE INDEX "beds_tenantId_id_key" ON "beds"("tenantId", "id");
CREATE UNIQUE INDEX "beds_tenantId_roomId_bedNo_key" ON "beds"("tenantId", "roomId", "bedNo");
CREATE INDEX "beds_tenantId_roomId_deletedAt_isActive_idx" ON "beds"("tenantId", "roomId", "deletedAt", "isActive");
CREATE UNIQUE INDEX "bed_statuses_tenantId_bedId_key" ON "bed_statuses"("tenantId", "bedId");
CREATE INDEX "bed_statuses_tenantId_currentStatus_idx" ON "bed_statuses"("tenantId", "currentStatus");
CREATE UNIQUE INDEX "bed_amenities_tenantId_name_key" ON "bed_amenities"("tenantId", "name");
CREATE UNIQUE INDEX "bed_amenities_tenantId_id_key" ON "bed_amenities"("tenantId", "id");
CREATE INDEX "bed_amenities_tenantId_deletedAt_isActive_idx" ON "bed_amenities"("tenantId", "deletedAt", "isActive");
CREATE UNIQUE INDEX "bed_amenity_mappings_tenantId_bedId_amenityId_key" ON "bed_amenity_mappings"("tenantId", "bedId", "amenityId");
CREATE INDEX "bed_amenity_mappings_tenantId_amenityId_deletedAt_idx" ON "bed_amenity_mappings"("tenantId", "amenityId", "deletedAt");

ALTER TABLE "room_types"
    ADD CONSTRAINT "room_types_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rooms"
    ADD CONSTRAINT "rooms_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId")
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "rooms_tenantId_roomTypeId_fkey"
    FOREIGN KEY ("tenantId", "roomTypeId") REFERENCES "room_types"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "beds"
    ADD CONSTRAINT "beds_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId")
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "beds_tenantId_roomId_fkey"
    FOREIGN KEY ("tenantId", "roomId") REFERENCES "rooms"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bed_statuses"
    ADD CONSTRAINT "bed_statuses_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId")
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "bed_statuses_tenantId_bedId_fkey"
    FOREIGN KEY ("tenantId", "bedId") REFERENCES "beds"("tenantId", "id")
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "bed_statuses_tenantId_patientId_fkey"
    FOREIGN KEY ("tenantId", "patientId") REFERENCES "patients"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bed_amenities"
    ADD CONSTRAINT "bed_amenities_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bed_amenity_mappings"
    ADD CONSTRAINT "bed_amenity_mappings_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId")
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "bed_amenity_mappings_tenantId_bedId_fkey"
    FOREIGN KEY ("tenantId", "bedId") REFERENCES "beds"("tenantId", "id")
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "bed_amenity_mappings_tenantId_amenityId_fkey"
    FOREIGN KEY ("tenantId", "amenityId") REFERENCES "bed_amenities"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
