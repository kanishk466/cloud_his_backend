-- AlterTable
ALTER TABLE "opd_bills" ADD COLUMN     "panelId" TEXT;

-- AlterTable
ALTER TABLE "panels" ADD COLUMN     "authorizationRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "claimSubmissionDays" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "counsellorAddress" TEXT,
ADD COLUMN     "embassyAddress" TEXT,
ADD COLUMN     "preAuthRequired" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "rate_schedules" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "panelId" TEXT NOT NULL,
    "tariffId" TEXT NOT NULL,
    "scheduleName" TEXT NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "panel_documents" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "panelId" TEXT NOT NULL,
    "documentName" TEXT NOT NULL,
    "documentCode" TEXT NOT NULL,
    "description" TEXT,
    "templateFileUrl" TEXT,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "appliesToOpd" BOOLEAN NOT NULL DEFAULT false,
    "appliesToIpd" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "panel_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rate_schedules_tenantId_panelId_effectiveFrom_idx" ON "rate_schedules"("tenantId", "panelId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "rate_schedules_tenantId_isActive_idx" ON "rate_schedules"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "panel_documents_tenantId_panelId_idx" ON "panel_documents"("tenantId", "panelId");

-- CreateIndex
CREATE UNIQUE INDEX "panel_documents_tenantId_panelId_documentCode_key" ON "panel_documents"("tenantId", "panelId", "documentCode");

-- CreateIndex
CREATE INDEX "opd_bills_tenantId_panelId_idx" ON "opd_bills"("tenantId", "panelId");

-- AddForeignKey
ALTER TABLE "opd_bills" ADD CONSTRAINT "opd_bills_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES "panels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_schedules" ADD CONSTRAINT "rate_schedules_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_schedules" ADD CONSTRAINT "rate_schedules_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES "panels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_schedules" ADD CONSTRAINT "rate_schedules_tariffId_fkey" FOREIGN KEY ("tariffId") REFERENCES "tariff_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "panel_documents" ADD CONSTRAINT "panel_documents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "panel_documents" ADD CONSTRAINT "panel_documents_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES "panels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
