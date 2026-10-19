-- Phase 3.3 — IPD clinical records + billing
-- New tables: ipd_vitals, ipd_rounds, ipd_medications, ipd_diet_orders,
--             ipd_charges, ipd_payments
-- All tenant-scoped (FK -> hospitals.tenantId) and admission-scoped
-- (FK -> ipd_admissions.id, cascade) exactly like Phase 1.4.

-- CreateTable
CREATE TABLE "ipd_vitals" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedBy" TEXT,
    "temperature" DECIMAL(4,1),
    "pulse" INTEGER,
    "respiratoryRate" INTEGER,
    "bpSystolic" INTEGER,
    "bpDiastolic" INTEGER,
    "spo2" INTEGER,
    "painScore" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ipd_vitals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ipd_rounds" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "roundAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "doctorProfileId" TEXT,
    "subjective" TEXT,
    "objective" TEXT,
    "assessment" TEXT,
    "plan" TEXT,
    "nextRoundAt" TIMESTAMP(3),
    "recordedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ipd_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ipd_medications" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "drugName" TEXT NOT NULL,
    "dose" TEXT NOT NULL,
    "route" TEXT NOT NULL DEFAULT 'ORAL',
    "frequency" TEXT NOT NULL DEFAULT 'OD',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "stoppedAt" TIMESTAMP(3),
    "stoppedBy" TEXT,
    "stopReason" TEXT,
    "notes" TEXT,
    "orderedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ipd_medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ipd_diet_orders" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "dietType" TEXT NOT NULL,
    "details" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "orderedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ipd_diet_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ipd_charges" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "chargeDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "accrualKey" TEXT,
    "notes" TEXT,
    "postedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ipd_charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ipd_payments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'CASH',
    "reference" TEXT,
    "notes" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ipd_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ipd_vitals_tenantId_admissionId_idx" ON "ipd_vitals"("tenantId", "admissionId");

-- CreateIndex
CREATE INDEX "ipd_vitals_tenantId_admissionId_recordedAt_idx" ON "ipd_vitals"("tenantId", "admissionId", "recordedAt");

-- CreateIndex
CREATE INDEX "ipd_rounds_tenantId_admissionId_idx" ON "ipd_rounds"("tenantId", "admissionId");

-- CreateIndex
CREATE INDEX "ipd_rounds_tenantId_admissionId_roundAt_idx" ON "ipd_rounds"("tenantId", "admissionId", "roundAt");

-- CreateIndex
CREATE INDEX "ipd_medications_tenantId_admissionId_idx" ON "ipd_medications"("tenantId", "admissionId");

-- CreateIndex
CREATE INDEX "ipd_medications_tenantId_admissionId_status_idx" ON "ipd_medications"("tenantId", "admissionId", "status");

-- CreateIndex
CREATE INDEX "ipd_diet_orders_tenantId_admissionId_idx" ON "ipd_diet_orders"("tenantId", "admissionId");

-- CreateIndex
CREATE INDEX "ipd_diet_orders_tenantId_admissionId_isActive_idx" ON "ipd_diet_orders"("tenantId", "admissionId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ipd_charges_tenantId_admissionId_accrualKey_key" ON "ipd_charges"("tenantId", "admissionId", "accrualKey");

-- CreateIndex
CREATE INDEX "ipd_charges_tenantId_admissionId_idx" ON "ipd_charges"("tenantId", "admissionId");

-- CreateIndex
CREATE INDEX "ipd_charges_tenantId_admissionId_chargeDate_idx" ON "ipd_charges"("tenantId", "admissionId", "chargeDate");

-- CreateIndex
CREATE INDEX "ipd_payments_tenantId_admissionId_idx" ON "ipd_payments"("tenantId", "admissionId");

-- CreateIndex
CREATE INDEX "ipd_payments_tenantId_admissionId_receivedAt_idx" ON "ipd_payments"("tenantId", "admissionId", "receivedAt");

-- AddForeignKey
ALTER TABLE "ipd_vitals" ADD CONSTRAINT "ipd_vitals_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipd_vitals" ADD CONSTRAINT "ipd_vitals_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "ipd_admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipd_rounds" ADD CONSTRAINT "ipd_rounds_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipd_rounds" ADD CONSTRAINT "ipd_rounds_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "ipd_admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipd_medications" ADD CONSTRAINT "ipd_medications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipd_medications" ADD CONSTRAINT "ipd_medications_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "ipd_admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipd_diet_orders" ADD CONSTRAINT "ipd_diet_orders_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipd_diet_orders" ADD CONSTRAINT "ipd_diet_orders_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "ipd_admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipd_charges" ADD CONSTRAINT "ipd_charges_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipd_charges" ADD CONSTRAINT "ipd_charges_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "ipd_admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipd_payments" ADD CONSTRAINT "ipd_payments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipd_payments" ADD CONSTRAINT "ipd_payments_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "ipd_admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
