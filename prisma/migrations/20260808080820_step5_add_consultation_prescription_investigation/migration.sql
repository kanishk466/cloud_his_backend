-- CreateTable
CREATE TABLE "consultations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "consultationNo" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorProfileId" TEXT NOT NULL,
    "chiefComplaints" TEXT,
    "historyOfIllness" TEXT,
    "pastHistory" TEXT,
    "familyHistory" TEXT,
    "personalHistory" TEXT,
    "generalExamination" TEXT,
    "systemicExamination" TEXT,
    "localExamination" TEXT,
    "provisionalDiagnosis" TEXT,
    "finalDiagnosis" TEXT,
    "icdCodes" TEXT[],
    "clinicalNotes" TEXT,
    "specialInstructions" TEXT,
    "followUpDate" DATE,
    "followUpNotes" TEXT,
    "referredToDoctorId" TEXT,
    "referredToDepartment" TEXT,
    "referralReason" TEXT,
    "status" "ConsultationStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescriptions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "medicineName" TEXT NOT NULL,
    "genericName" TEXT,
    "medicineType" TEXT,
    "dosage" TEXT,
    "frequency" "PrescriptionFrequency" NOT NULL DEFAULT 'TWICE_DAILY',
    "customFrequency" TEXT,
    "route" "MedicineRoute" NOT NULL DEFAULT 'ORAL',
    "mealRelation" "MealRelation" NOT NULL DEFAULT 'AFTER_FOOD',
    "durationDays" INTEGER,
    "durationWeeks" INTEGER,
    "quantity" INTEGER,
    "instructions" TEXT,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investigation_orders" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "investigationName" TEXT NOT NULL,
    "investigationType" "InvestigationType" NOT NULL DEFAULT 'LAB',
    "urgency" "InvestigationUrgency" NOT NULL DEFAULT 'ROUTINE',
    "instructions" TEXT,
    "clinicalNotes" TEXT,
    "status" "InvestigationStatus" NOT NULL DEFAULT 'ORDERED',
    "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "resultSummary" TEXT,
    "resultFile" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investigation_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "consultations_appointmentId_key" ON "consultations"("appointmentId");

-- CreateIndex
CREATE INDEX "consultations_tenantId_patientId_idx" ON "consultations"("tenantId", "patientId");

-- CreateIndex
CREATE INDEX "consultations_tenantId_doctorProfileId_idx" ON "consultations"("tenantId", "doctorProfileId");

-- CreateIndex
CREATE INDEX "consultations_tenantId_appointmentId_idx" ON "consultations"("tenantId", "appointmentId");

-- CreateIndex
CREATE INDEX "consultations_tenantId_startedAt_idx" ON "consultations"("tenantId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "consultations_tenantId_consultationNo_key" ON "consultations"("tenantId", "consultationNo");

-- CreateIndex
CREATE INDEX "prescriptions_tenantId_consultationId_idx" ON "prescriptions"("tenantId", "consultationId");

-- CreateIndex
CREATE INDEX "investigation_orders_tenantId_consultationId_idx" ON "investigation_orders"("tenantId", "consultationId");

-- CreateIndex
CREATE INDEX "investigation_orders_tenantId_status_idx" ON "investigation_orders"("tenantId", "status");

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_doctorProfileId_fkey" FOREIGN KEY ("doctorProfileId") REFERENCES "doctor_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "consultations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigation_orders" ADD CONSTRAINT "investigation_orders_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigation_orders" ADD CONSTRAINT "investigation_orders_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "consultations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
