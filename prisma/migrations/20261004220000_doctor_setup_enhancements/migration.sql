CREATE TYPE "DoctorType" AS ENUM ('FULL_TIME', 'VISITING', 'CONSULTANT');

CREATE TABLE "clinical_departments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "clinical_departments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "doctor_specializations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clinicalDepartmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "doctor_specializations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "opd_visit_configs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "doctorProfileId" TEXT NOT NULL,
    "freeFollowupDays" INTEGER NOT NULL DEFAULT 0,
    "maxFreeVisits" INTEGER NOT NULL DEFAULT 0,
    "revisitChargePercent" DECIMAL(5,2) NOT NULL DEFAULT 100,
    "validityAfterPrescription" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "opd_visit_configs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "refer_doctors" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT,
    "name" TEXT NOT NULL,
    "mobile" TEXT,
    "address" TEXT,
    "specialty" TEXT,
    "hospitalName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "refer_doctors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pro_mappings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "proName" TEXT,
    "hospitalUserId" TEXT,
    "referDoctorId" TEXT NOT NULL,
    "commissionPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "pro_mappings_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "doctor_profiles"
    ADD COLUMN "specializationId" TEXT,
    ADD COLUMN "title" TEXT,
    ADD COLUMN "degree" TEXT,
    ADD COLUMN "designation" TEXT,
    ADD COLUMN "doctorType" "DoctorType" NOT NULL DEFAULT 'FULL_TIME',
    ADD COLUMN "doctorShare" DECIMAL(5,2),
    ADD COLUMN "discountApplicable" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN "emergencyAvailable" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "digitalSignatureUrl" TEXT,
    ADD COLUMN "prescriptionHeader1" TEXT,
    ADD COLUMN "prescriptionHeader2" TEXT,
    ADD COLUMN "taxPin" TEXT,
    ADD COLUMN "maxPatientsPerSlot" INTEGER;

CREATE UNIQUE INDEX "clinical_departments_tenantId_name_key"
    ON "clinical_departments"("tenantId", "name");
CREATE INDEX "clinical_departments_tenantId_deletedAt_idx"
    ON "clinical_departments"("tenantId", "deletedAt");
CREATE UNIQUE INDEX "doctor_specializations_clinicalDepartmentId_name_key"
    ON "doctor_specializations"("clinicalDepartmentId", "name");
CREATE INDEX "doctor_specializations_tenantId_clinicalDepartmentId_deletedAt_idx"
    ON "doctor_specializations"("tenantId", "clinicalDepartmentId", "deletedAt");
CREATE UNIQUE INDEX "opd_visit_configs_doctorProfileId_key"
    ON "opd_visit_configs"("doctorProfileId");
CREATE INDEX "opd_visit_configs_tenantId_doctorProfileId_idx"
    ON "opd_visit_configs"("tenantId", "doctorProfileId");
CREATE UNIQUE INDEX "opd_visit_configs_tenantId_doctorProfileId_key"
    ON "opd_visit_configs"("tenantId", "doctorProfileId");
CREATE UNIQUE INDEX "refer_doctors_tenantId_name_mobile_key"
    ON "refer_doctors"("tenantId", "name", "mobile");
CREATE INDEX "refer_doctors_tenantId_deletedAt_isActive_idx"
    ON "refer_doctors"("tenantId", "deletedAt", "isActive");
CREATE INDEX "pro_mappings_tenantId_referDoctorId_isActive_idx"
    ON "pro_mappings"("tenantId", "referDoctorId", "isActive");
CREATE INDEX "pro_mappings_tenantId_hospitalUserId_idx"
    ON "pro_mappings"("tenantId", "hospitalUserId");
CREATE INDEX "doctor_profiles_tenantId_specializationId_idx"
    ON "doctor_profiles"("tenantId", "specializationId");
CREATE UNIQUE INDEX "hospital_users_tenantId_id_key" ON "hospital_users"("tenantId", "id");
CREATE UNIQUE INDEX "doctor_profiles_tenantId_id_key" ON "doctor_profiles"("tenantId", "id");
CREATE UNIQUE INDEX "clinical_departments_tenantId_id_key"
    ON "clinical_departments"("tenantId", "id");
CREATE UNIQUE INDEX "doctor_specializations_tenantId_id_key"
    ON "doctor_specializations"("tenantId", "id");
CREATE UNIQUE INDEX "refer_doctors_tenantId_id_key" ON "refer_doctors"("tenantId", "id");

ALTER TABLE "clinical_departments"
    ADD CONSTRAINT "clinical_departments_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "doctor_specializations"
    ADD CONSTRAINT "doctor_specializations_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId")
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "doctor_specializations_tenantId_clinicalDepartmentId_fkey"
    FOREIGN KEY ("tenantId", "clinicalDepartmentId") REFERENCES "clinical_departments"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "doctor_profiles"
    ADD CONSTRAINT "doctor_profiles_tenantId_specializationId_fkey"
    FOREIGN KEY ("tenantId", "specializationId") REFERENCES "doctor_specializations"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "opd_visit_configs"
    ADD CONSTRAINT "opd_visit_configs_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId")
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "opd_visit_configs_tenantId_doctorProfileId_fkey"
    FOREIGN KEY ("tenantId", "doctorProfileId") REFERENCES "doctor_profiles"("tenantId", "id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "refer_doctors"
    ADD CONSTRAINT "refer_doctors_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pro_mappings"
    ADD CONSTRAINT "pro_mappings_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId")
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "pro_mappings_tenantId_hospitalUserId_fkey"
    FOREIGN KEY ("tenantId", "hospitalUserId") REFERENCES "hospital_users"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "pro_mappings_tenantId_referDoctorId_fkey"
    FOREIGN KEY ("tenantId", "referDoctorId") REFERENCES "refer_doctors"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
