-- CreateEnum
CREATE TYPE "PackageType" AS ENUM ('OPD_HEALTH_CHECK', 'IPD_SURGERY', 'DAYCARE_PROCEDURE', 'CUSTOM_BUNDLE');

-- CreateEnum
CREATE TYPE "ConsultTypeInPackage" AS ENUM ('OPD_VISIT', 'IPD_DOCTOR_ROUND', 'CROSS_CONSULTATION');

-- CreateTable
CREATE TABLE "package_masters" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "serviceId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "packageType" "PackageType" NOT NULL DEFAULT 'OPD_HEALTH_CHECK',
    "roomTypeId" TEXT,
    "includedStayDays" INTEGER DEFAULT 0,
    "basePrice" DECIMAL(10,2) NOT NULL,
    "validityDays" INTEGER NOT NULL DEFAULT 30,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "package_masters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_components" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "package_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_doctor_consults" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "clinicalDepartmentId" TEXT,
    "doctorProfileId" TEXT,
    "consultType" "ConsultTypeInPackage" NOT NULL DEFAULT 'OPD_VISIT',
    "maxVisits" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "package_doctor_consults_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_exclusions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "exclusionText" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "package_exclusions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_consumptions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "serviceId" TEXT,
    "doctorProfileId" TEXT,
    "consumedQuantity" INTEGER NOT NULL DEFAULT 1,
    "isExtraBilled" BOOLEAN NOT NULL DEFAULT false,
    "billId" TEXT,
    "notes" TEXT,
    "consumedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "package_consumptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "package_masters_serviceId_key" ON "package_masters"("serviceId");

-- CreateIndex
CREATE INDEX "package_masters_tenantId_packageType_idx" ON "package_masters"("tenantId", "packageType");

-- CreateIndex
CREATE UNIQUE INDEX "package_masters_tenantId_code_key" ON "package_masters"("tenantId", "code");

-- CreateIndex
CREATE INDEX "package_components_tenantId_packageId_idx" ON "package_components"("tenantId", "packageId");

-- CreateIndex
CREATE UNIQUE INDEX "package_components_packageId_serviceId_key" ON "package_components"("packageId", "serviceId");

-- CreateIndex
CREATE INDEX "package_doctor_consults_tenantId_packageId_idx" ON "package_doctor_consults"("tenantId", "packageId");

-- CreateIndex
CREATE INDEX "package_exclusions_tenantId_packageId_idx" ON "package_exclusions"("tenantId", "packageId");

-- CreateIndex
CREATE INDEX "package_consumptions_tenantId_packageId_patientId_idx" ON "package_consumptions"("tenantId", "packageId", "patientId");

-- CreateIndex
CREATE INDEX "package_consumptions_tenantId_patientId_idx" ON "package_consumptions"("tenantId", "patientId");

-- AddForeignKey
ALTER TABLE "package_masters" ADD CONSTRAINT "package_masters_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_masters" ADD CONSTRAINT "package_masters_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "room_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_masters" ADD CONSTRAINT "package_masters_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "service_masters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_components" ADD CONSTRAINT "package_components_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_components" ADD CONSTRAINT "package_components_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "package_masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_components" ADD CONSTRAINT "package_components_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "service_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_doctor_consults" ADD CONSTRAINT "package_doctor_consults_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_doctor_consults" ADD CONSTRAINT "package_doctor_consults_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "package_masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_doctor_consults" ADD CONSTRAINT "package_doctor_consults_clinicalDepartmentId_fkey" FOREIGN KEY ("clinicalDepartmentId") REFERENCES "clinical_departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_doctor_consults" ADD CONSTRAINT "package_doctor_consults_doctorProfileId_fkey" FOREIGN KEY ("doctorProfileId") REFERENCES "doctor_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_exclusions" ADD CONSTRAINT "package_exclusions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_exclusions" ADD CONSTRAINT "package_exclusions_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "package_masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_consumptions" ADD CONSTRAINT "package_consumptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_consumptions" ADD CONSTRAINT "package_consumptions_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "package_masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_consumptions" ADD CONSTRAINT "package_consumptions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_consumptions" ADD CONSTRAINT "package_consumptions_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "service_masters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_consumptions" ADD CONSTRAINT "package_consumptions_doctorProfileId_fkey" FOREIGN KEY ("doctorProfileId") REFERENCES "doctor_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
