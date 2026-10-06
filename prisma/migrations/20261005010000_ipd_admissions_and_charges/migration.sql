CREATE TYPE "IpdAdmissionType" AS ENUM ('ELECTIVE', 'EMERGENCY', 'DAYCARE', 'DIALYSIS');
CREATE TYPE "IpdAdmissionStatus" AS ENUM ('ACTIVE', 'DISCHARGED', 'CANCELLED');

ALTER TABLE "room_types"
    ADD COLUMN "dailyChargeItemId" TEXT,
    ADD COLUMN "thresholdLimitAmount" DECIMAL(12,2);

CREATE TABLE "ipd_admissions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "admissionNo" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "bedId" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "admissionType" "IpdAdmissionType" NOT NULL,
    "status" "IpdAdmissionStatus" NOT NULL DEFAULT 'ACTIVE',
    "admittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedDischargeAt" TIMESTAMP(3),
    "dischargedAt" TIMESTAMP(3),
    "admittingDoctorId" TEXT,
    "reason" TEXT,
    "roomTypeNameSnapshot" TEXT NOT NULL,
    "roomNoSnapshot" TEXT NOT NULL,
    "bedNoSnapshot" TEXT NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ipd_admissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ipd_charges" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "chargeDate" DATE NOT NULL,
    "serviceCodeSnapshot" TEXT NOT NULL,
    "serviceNameSnapshot" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitRate" DECIMAL(10,2) NOT NULL,
    "isPackageCovered" BOOLEAN NOT NULL DEFAULT false,
    "discountable" BOOLEAN NOT NULL DEFAULT true,
    "thresholdOverridden" BOOLEAN NOT NULL DEFAULT false,
    "thresholdOverrideBy" TEXT,
    "isRoomDailyCharge" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ipd_charges_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "package_consumptions"
    ADD COLUMN "admissionId" TEXT;
ALTER TABLE "package_usages"
    ADD COLUMN "ipdChargeId" TEXT;

CREATE UNIQUE INDEX "ipd_admissions_tenantId_id_key"
    ON "ipd_admissions"("tenantId", "id");
CREATE UNIQUE INDEX "ipd_admissions_tenantId_admissionNo_key"
    ON "ipd_admissions"("tenantId", "admissionNo");
CREATE INDEX "ipd_admissions_tenantId_patientId_status_idx"
    ON "ipd_admissions"("tenantId", "patientId", "status");
CREATE INDEX "ipd_admissions_tenantId_bedId_status_idx"
    ON "ipd_admissions"("tenantId", "bedId", "status");
CREATE INDEX "ipd_admissions_tenantId_roomTypeId_status_idx"
    ON "ipd_admissions"("tenantId", "roomTypeId", "status");
CREATE UNIQUE INDEX "ipd_admissions_one_active_bed_key"
    ON "ipd_admissions"("tenantId", "bedId") WHERE "status" = 'ACTIVE';
CREATE UNIQUE INDEX "ipd_admissions_one_active_patient_key"
    ON "ipd_admissions"("tenantId", "patientId") WHERE "status" = 'ACTIVE';
CREATE UNIQUE INDEX "ipd_charges_tenantId_id_key"
    ON "ipd_charges"("tenantId", "id");
CREATE INDEX "ipd_charges_tenantId_admissionId_chargeDate_idx"
    ON "ipd_charges"("tenantId", "admissionId", "chargeDate");
CREATE INDEX "ipd_charges_tenantId_serviceId_idx"
    ON "ipd_charges"("tenantId", "serviceId");
CREATE UNIQUE INDEX "ipd_charges_one_room_daily_charge_key"
    ON "ipd_charges"("tenantId", "admissionId", "chargeDate")
    WHERE "isRoomDailyCharge" = true;
CREATE INDEX "package_consumptions_tenantId_admissionId_idx"
    ON "package_consumptions"("tenantId", "admissionId");
CREATE INDEX "package_usages_tenantId_ipdChargeId_idx"
    ON "package_usages"("tenantId", "ipdChargeId");

ALTER TABLE "room_types"
    ADD CONSTRAINT "room_types_tenantId_dailyChargeItemId_fkey"
    FOREIGN KEY ("tenantId", "dailyChargeItemId")
    REFERENCES "service_masters"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "room_types"
    ADD CONSTRAINT "room_types_thresholdLimitAmount_nonnegative_check"
    CHECK ("thresholdLimitAmount" IS NULL OR "thresholdLimitAmount" >= 0);
ALTER TABLE "ipd_admissions"
    ADD CONSTRAINT "ipd_admissions_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId")
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "ipd_admissions_tenantId_patientId_fkey"
    FOREIGN KEY ("tenantId", "patientId") REFERENCES "patients"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "ipd_admissions_tenantId_bedId_fkey"
    FOREIGN KEY ("tenantId", "bedId") REFERENCES "beds"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "ipd_admissions_tenantId_roomTypeId_fkey"
    FOREIGN KEY ("tenantId", "roomTypeId") REFERENCES "room_types"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "ipd_admissions_tenantId_admittingDoctorId_fkey"
    FOREIGN KEY ("tenantId", "admittingDoctorId")
    REFERENCES "doctor_profiles"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bed_statuses"
    ADD CONSTRAINT "bed_statuses_tenantId_admissionId_fkey"
    FOREIGN KEY ("tenantId", "admissionId")
    REFERENCES "ipd_admissions"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ipd_charges"
    ADD CONSTRAINT "ipd_charges_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId")
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "ipd_charges_tenantId_admissionId_fkey"
    FOREIGN KEY ("tenantId", "admissionId")
    REFERENCES "ipd_admissions"("tenantId", "id")
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "ipd_charges_tenantId_serviceId_fkey"
    FOREIGN KEY ("tenantId", "serviceId")
    REFERENCES "service_masters"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "package_consumptions"
    ADD CONSTRAINT "package_consumptions_tenantId_admissionId_fkey"
    FOREIGN KEY ("tenantId", "admissionId")
    REFERENCES "ipd_admissions"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "package_usages"
    ADD CONSTRAINT "package_usages_tenantId_ipdChargeId_fkey"
    FOREIGN KEY ("tenantId", "ipdChargeId")
    REFERENCES "ipd_charges"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
