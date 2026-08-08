-- CreateTable
CREATE TABLE "patient_vitals" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "consultationId" TEXT,
    "appointmentId" TEXT,
    "heightCm" DECIMAL(5,2),
    "weightKg" DECIMAL(5,2),
    "bmi" DECIMAL(4,1),
    "temperatureF" DECIMAL(4,1),
    "bloodPressureSys" INTEGER,
    "bloodPressureDia" INTEGER,
    "pulseRate" INTEGER,
    "respiratoryRate" INTEGER,
    "spo2" DECIMAL(4,1),
    "bloodSugarFasting" DECIMAL(5,1),
    "bloodSugarPP" DECIMAL(5,1),
    "bloodSugarRandom" DECIMAL(5,1),
    "painScore" INTEGER,
    "chiefComplaints" TEXT,
    "notes" TEXT,
    "recordedBy" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_vitals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "patient_vitals_tenantId_patientId_idx" ON "patient_vitals"("tenantId", "patientId");

-- CreateIndex
CREATE INDEX "patient_vitals_tenantId_appointmentId_idx" ON "patient_vitals"("tenantId", "appointmentId");

-- CreateIndex
CREATE INDEX "patient_vitals_tenantId_recordedAt_idx" ON "patient_vitals"("tenantId", "recordedAt");

-- AddForeignKey
ALTER TABLE "patient_vitals" ADD CONSTRAINT "patient_vitals_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_vitals" ADD CONSTRAINT "patient_vitals_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
