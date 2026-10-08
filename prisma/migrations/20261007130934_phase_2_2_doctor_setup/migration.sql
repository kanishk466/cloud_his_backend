-- AlterTable
ALTER TABLE "doctor_profiles" ADD COLUMN     "clinicalDepartmentId" TEXT,
ADD COLUMN     "digitalSignatureUrl" TEXT,
ADD COLUMN     "doctorSharePercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "specializationId" TEXT;

-- CreateTable
CREATE TABLE "clinical_departments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinical_departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "specializations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clinicalDepartmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "specializations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_opd_visit_configs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "doctorProfileId" TEXT NOT NULL,
    "panelId" TEXT,
    "firstVisitFee" DECIMAL(10,2) NOT NULL,
    "followUpDays" INTEGER NOT NULL DEFAULT 7,
    "followUpMaxVisits" INTEGER NOT NULL DEFAULT 1,
    "followUpFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "emergencyFee" DECIMAL(10,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_opd_visit_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refer_doctors" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "clinicHospitalName" TEXT,
    "mobile" TEXT NOT NULL,
    "email" TEXT,
    "specialization" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "commissionPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "panNumber" TEXT,
    "bankAccountNo" TEXT,
    "ifscCode" TEXT,
    "proUserId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refer_doctors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clinical_departments_tenantId_idx" ON "clinical_departments"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "clinical_departments_tenantId_code_key" ON "clinical_departments"("tenantId", "code");

-- CreateIndex
CREATE INDEX "specializations_tenantId_clinicalDepartmentId_idx" ON "specializations"("tenantId", "clinicalDepartmentId");

-- CreateIndex
CREATE UNIQUE INDEX "specializations_tenantId_code_key" ON "specializations"("tenantId", "code");

-- CreateIndex
CREATE INDEX "doctor_opd_visit_configs_tenantId_doctorProfileId_idx" ON "doctor_opd_visit_configs"("tenantId", "doctorProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_opd_visit_configs_tenantId_doctorProfileId_panelId_key" ON "doctor_opd_visit_configs"("tenantId", "doctorProfileId", "panelId");

-- CreateIndex
CREATE INDEX "refer_doctors_tenantId_proUserId_idx" ON "refer_doctors"("tenantId", "proUserId");

-- CreateIndex
CREATE UNIQUE INDEX "refer_doctors_tenantId_mobile_key" ON "refer_doctors"("tenantId", "mobile");

-- AddForeignKey
ALTER TABLE "doctor_profiles" ADD CONSTRAINT "doctor_profiles_clinicalDepartmentId_fkey" FOREIGN KEY ("clinicalDepartmentId") REFERENCES "clinical_departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_profiles" ADD CONSTRAINT "doctor_profiles_specializationId_fkey" FOREIGN KEY ("specializationId") REFERENCES "specializations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_departments" ADD CONSTRAINT "clinical_departments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specializations" ADD CONSTRAINT "specializations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specializations" ADD CONSTRAINT "specializations_clinicalDepartmentId_fkey" FOREIGN KEY ("clinicalDepartmentId") REFERENCES "clinical_departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_opd_visit_configs" ADD CONSTRAINT "doctor_opd_visit_configs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_opd_visit_configs" ADD CONSTRAINT "doctor_opd_visit_configs_doctorProfileId_fkey" FOREIGN KEY ("doctorProfileId") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_opd_visit_configs" ADD CONSTRAINT "doctor_opd_visit_configs_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES "panels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refer_doctors" ADD CONSTRAINT "refer_doctors_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refer_doctors" ADD CONSTRAINT "refer_doctors_proUserId_fkey" FOREIGN KEY ("proUserId") REFERENCES "hospital_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
