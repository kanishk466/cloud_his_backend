-- CreateEnum
CREATE TYPE "OrganismType" AS ENUM ('BACTERIA_GRAM_POSITIVE', 'BACTERIA_GRAM_NEGATIVE', 'BACTERIA_AFB', 'FUNGI', 'PARASITE', 'VIRUS', 'OTHER');

-- CreateEnum
CREATE TYPE "AntibioticClass" AS ENUM ('PENICILLINS', 'CEPHALOSPORINS', 'CARBAPENEMS', 'FLUOROQUINOLONES', 'AMINOGLYCOSIDES', 'MACROLIDES', 'GLYCOPEPTIDES', 'TETRACYCLINES', 'SULFONAMIDES', 'OXAZOLIDINONES', 'POLYMYXINS', 'OTHER');

-- CreateEnum
CREATE TYPE "AstResultType" AS ENUM ('SENSITIVE', 'INTERMEDIATE', 'RESISTANT', 'NOT_TESTED');

-- AlterTable
ALTER TABLE "investigations" ADD COLUMN     "outsourceLabId" TEXT;

-- CreateTable
CREATE TABLE "organism_masters" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "organismType" "OrganismType" NOT NULL DEFAULT 'BACTERIA_GRAM_NEGATIVE',
    "description" TEXT,
    "isCommon" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organism_masters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "antibiotic_masters" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "antibioticClass" "AntibioticClass" NOT NULL DEFAULT 'OTHER',
    "standardDosage" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "antibiotic_masters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organism_antibiotic_mappings" (
    "id" TEXT NOT NULL,
    "organismId" TEXT NOT NULL,
    "antibioticId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isFirstLine" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "organism_antibiotic_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outsource_lab_masters" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "labName" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "portalUrl" TEXT,
    "courierPickupTime" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outsource_lab_masters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_signoff_authorities" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "hospitalUserId" TEXT NOT NULL,
    "labDepartmentId" TEXT,
    "designationText" TEXT NOT NULL,
    "medicalRegNo" TEXT,
    "canVerify" BOOLEAN NOT NULL DEFAULT true,
    "canApproveLock" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_signoff_authorities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "organism_masters_tenantId_organismType_idx" ON "organism_masters"("tenantId", "organismType");

-- CreateIndex
CREATE UNIQUE INDEX "organism_masters_tenantId_code_key" ON "organism_masters"("tenantId", "code");

-- CreateIndex
CREATE INDEX "antibiotic_masters_tenantId_antibioticClass_idx" ON "antibiotic_masters"("tenantId", "antibioticClass");

-- CreateIndex
CREATE UNIQUE INDEX "antibiotic_masters_tenantId_code_key" ON "antibiotic_masters"("tenantId", "code");

-- CreateIndex
CREATE INDEX "organism_antibiotic_mappings_organismId_idx" ON "organism_antibiotic_mappings"("organismId");

-- CreateIndex
CREATE INDEX "organism_antibiotic_mappings_antibioticId_idx" ON "organism_antibiotic_mappings"("antibioticId");

-- CreateIndex
CREATE UNIQUE INDEX "organism_antibiotic_mappings_organismId_antibioticId_key" ON "organism_antibiotic_mappings"("organismId", "antibioticId");

-- CreateIndex
CREATE INDEX "outsource_lab_masters_tenantId_idx" ON "outsource_lab_masters"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "outsource_lab_masters_tenantId_code_key" ON "outsource_lab_masters"("tenantId", "code");

-- CreateIndex
CREATE INDEX "lab_signoff_authorities_tenantId_hospitalUserId_idx" ON "lab_signoff_authorities"("tenantId", "hospitalUserId");

-- CreateIndex
CREATE UNIQUE INDEX "lab_signoff_authorities_tenantId_hospitalUserId_labDepartme_key" ON "lab_signoff_authorities"("tenantId", "hospitalUserId", "labDepartmentId");

-- AddForeignKey
ALTER TABLE "investigations" ADD CONSTRAINT "investigations_outsourceLabId_fkey" FOREIGN KEY ("outsourceLabId") REFERENCES "outsource_lab_masters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organism_masters" ADD CONSTRAINT "organism_masters_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "antibiotic_masters" ADD CONSTRAINT "antibiotic_masters_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organism_antibiotic_mappings" ADD CONSTRAINT "organism_antibiotic_mappings_organismId_fkey" FOREIGN KEY ("organismId") REFERENCES "organism_masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organism_antibiotic_mappings" ADD CONSTRAINT "organism_antibiotic_mappings_antibioticId_fkey" FOREIGN KEY ("antibioticId") REFERENCES "antibiotic_masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outsource_lab_masters" ADD CONSTRAINT "outsource_lab_masters_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_signoff_authorities" ADD CONSTRAINT "lab_signoff_authorities_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_signoff_authorities" ADD CONSTRAINT "lab_signoff_authorities_hospitalUserId_fkey" FOREIGN KEY ("hospitalUserId") REFERENCES "hospital_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_signoff_authorities" ADD CONSTRAINT "lab_signoff_authorities_labDepartmentId_fkey" FOREIGN KEY ("labDepartmentId") REFERENCES "lab_departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
