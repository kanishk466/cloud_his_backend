-- CreateEnum
CREATE TYPE "LabDepartmentType" AS ENUM ('BIOCHEMISTRY', 'HEMATOLOGY', 'MICROBIOLOGY', 'PATHOLOGY', 'SEROLOGY', 'RADIOLOGY', 'CARDIOLOGY', 'NUCLEAR_MEDICINE', 'OTHER');

-- CreateEnum
CREATE TYPE "ObservationDataType" AS ENUM ('NUMERIC', 'TEXT', 'BOOLEAN', 'SELECT', 'CALCULATED');

-- CreateEnum
CREATE TYPE "SpecimenType" AS ENUM ('BLOOD', 'SERUM', 'PLASMA', 'URINE', 'STOOL', 'SPUTUM', 'CSF', 'SWAB', 'TISSUE', 'FLUID', 'OTHER');

-- CreateEnum
CREATE TYPE "InvestigationReportStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'VERIFIED', 'APPROVED', 'REJECTED', 'AMENDED');

-- CreateTable
CREATE TABLE "lab_departments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "departmentType" "LabDepartmentType" NOT NULL,
    "headUserId" TEXT,
    "location" TEXT,
    "turnaroundHours" INTEGER NOT NULL DEFAULT 24,
    "allowTemplates" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investigations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "labDepartmentId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "shortName" TEXT,
    "specimenType" "SpecimenType" NOT NULL DEFAULT 'BLOOD',
    "specimenVolume" TEXT,
    "containerColor" TEXT,
    "fastingRequired" BOOLEAN NOT NULL DEFAULT false,
    "reportingFormat" TEXT,
    "outsourceLabName" TEXT,
    "outsourceTatHours" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investigations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "observations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "dataType" "ObservationDataType" NOT NULL DEFAULT 'NUMERIC',
    "unit" TEXT,
    "decimalPlaces" INTEGER NOT NULL DEFAULT 2,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "selectOptions" TEXT[],
    "formulaExpression" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investigation_observation_mappings" (
    "id" TEXT NOT NULL,
    "investigationId" TEXT NOT NULL,
    "observationId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "isReportable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "investigation_observation_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reference_ranges" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "observationId" TEXT NOT NULL,
    "gender" "Gender",
    "minAgeYears" INTEGER,
    "maxAgeYears" INTEGER,
    "minValue" DECIMAL(10,4),
    "maxValue" DECIMAL(10,4),
    "normalText" TEXT,
    "criticalLow" DECIMAL(10,4),
    "criticalHigh" DECIMAL(10,4),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reference_ranges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lab_departments_tenantId_idx" ON "lab_departments"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "lab_departments_tenantId_code_key" ON "lab_departments"("tenantId", "code");

-- CreateIndex
CREATE INDEX "investigations_tenantId_labDepartmentId_idx" ON "investigations"("tenantId", "labDepartmentId");

-- CreateIndex
CREATE INDEX "investigations_tenantId_serviceId_idx" ON "investigations"("tenantId", "serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "investigations_tenantId_code_key" ON "investigations"("tenantId", "code");

-- CreateIndex
CREATE INDEX "observations_tenantId_idx" ON "observations"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "observations_tenantId_code_key" ON "observations"("tenantId", "code");

-- CreateIndex
CREATE INDEX "investigation_observation_mappings_investigationId_idx" ON "investigation_observation_mappings"("investigationId");

-- CreateIndex
CREATE INDEX "investigation_observation_mappings_observationId_idx" ON "investigation_observation_mappings"("observationId");

-- CreateIndex
CREATE UNIQUE INDEX "investigation_observation_mappings_investigationId_observat_key" ON "investigation_observation_mappings"("investigationId", "observationId");

-- CreateIndex
CREATE INDEX "reference_ranges_tenantId_observationId_idx" ON "reference_ranges"("tenantId", "observationId");

-- CreateIndex
CREATE INDEX "reference_ranges_observationId_gender_idx" ON "reference_ranges"("observationId", "gender");

-- AddForeignKey
ALTER TABLE "lab_departments" ADD CONSTRAINT "lab_departments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigations" ADD CONSTRAINT "investigations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigations" ADD CONSTRAINT "investigations_labDepartmentId_fkey" FOREIGN KEY ("labDepartmentId") REFERENCES "lab_departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigations" ADD CONSTRAINT "investigations_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "service_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigation_observation_mappings" ADD CONSTRAINT "investigation_observation_mappings_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "investigations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigation_observation_mappings" ADD CONSTRAINT "investigation_observation_mappings_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "observations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reference_ranges" ADD CONSTRAINT "reference_ranges_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reference_ranges" ADD CONSTRAINT "reference_ranges_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "observations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
