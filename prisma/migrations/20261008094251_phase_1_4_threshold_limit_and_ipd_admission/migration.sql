-- CreateTable
CREATE TABLE "ipd_admissions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "admissionNo" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorProfileId" TEXT NOT NULL,
    "bedId" TEXT,
    "panelId" TEXT,
    "referDoctorId" TEXT,
    "admissionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "admissionType" TEXT NOT NULL DEFAULT 'EMERGENCY',
    "provisionalDiagnosis" TEXT,
    "reasonForAdmission" TEXT,
    "expectedDischargeDate" DATE,
    "dischargeDate" TIMESTAMP(3),
    "dischargeType" TEXT,
    "dischargeSummary" TEXT,
    "dischargedBy" TEXT,
    "advancePaid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "provisionalTotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "thresholdBreached" BOOLEAN NOT NULL DEFAULT false,
    "thresholdAlertSent" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ADMITTED',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ipd_admissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "threshold_limits" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "panelId" TEXT NOT NULL,
    "roomTypeId" TEXT,
    "maxAmount" DECIMAL(15,2) NOT NULL,
    "alertAtPercent" DECIMAL(5,2) NOT NULL DEFAULT 80,
    "actionOnBreach" TEXT NOT NULL DEFAULT 'SOFT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "threshold_limits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ipd_admissions_tenantId_patientId_idx" ON "ipd_admissions"("tenantId", "patientId");

-- CreateIndex
CREATE INDEX "ipd_admissions_tenantId_bedId_idx" ON "ipd_admissions"("tenantId", "bedId");

-- CreateIndex
CREATE INDEX "ipd_admissions_tenantId_status_idx" ON "ipd_admissions"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ipd_admissions_tenantId_panelId_idx" ON "ipd_admissions"("tenantId", "panelId");

-- CreateIndex
CREATE UNIQUE INDEX "ipd_admissions_tenantId_admissionNo_key" ON "ipd_admissions"("tenantId", "admissionNo");

-- CreateIndex
CREATE INDEX "threshold_limits_tenantId_panelId_idx" ON "threshold_limits"("tenantId", "panelId");

-- CreateIndex
CREATE UNIQUE INDEX "threshold_limits_tenantId_panelId_roomTypeId_key" ON "threshold_limits"("tenantId", "panelId", "roomTypeId");

-- AddForeignKey
ALTER TABLE "bed_statuses" ADD CONSTRAINT "bed_statuses_ipdAdmissionId_fkey" FOREIGN KEY ("ipdAdmissionId") REFERENCES "ipd_admissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipd_admissions" ADD CONSTRAINT "ipd_admissions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipd_admissions" ADD CONSTRAINT "ipd_admissions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipd_admissions" ADD CONSTRAINT "ipd_admissions_doctorProfileId_fkey" FOREIGN KEY ("doctorProfileId") REFERENCES "doctor_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipd_admissions" ADD CONSTRAINT "ipd_admissions_bedId_fkey" FOREIGN KEY ("bedId") REFERENCES "beds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipd_admissions" ADD CONSTRAINT "ipd_admissions_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES "panels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "threshold_limits" ADD CONSTRAINT "threshold_limits_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "threshold_limits" ADD CONSTRAINT "threshold_limits_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES "panels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "threshold_limits" ADD CONSTRAINT "threshold_limits_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "room_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
