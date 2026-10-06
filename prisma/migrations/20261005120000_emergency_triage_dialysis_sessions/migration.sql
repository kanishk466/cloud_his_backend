CREATE TYPE "EmergencyTriageStatus" AS ENUM (
    'WAITING',
    'IN_TREATMENT',
    'ADMITTED',
    'DISCHARGED',
    'LEFT_WITHOUT_BEING_SEEN'
);

CREATE TYPE "DialysisSessionStatus" AS ENUM (
    'SCHEDULED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED'
);

CREATE TABLE "emergency_triages" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "triageNo" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "triageLevel" INTEGER NOT NULL,
    "chiefComplaint" TEXT NOT NULL,
    "temperatureC" DECIMAL(4,1),
    "pulseBpm" INTEGER,
    "systolicBp" INTEGER,
    "diastolicBp" INTEGER,
    "respiratoryRate" INTEGER,
    "oxygenSaturation" INTEGER,
    "status" "EmergencyTriageStatus" NOT NULL DEFAULT 'WAITING',
    "notes" TEXT,
    "assignedDoctorId" TEXT,
    "admissionId" TEXT,
    "triagedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "emergency_triages_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "emergency_triages_level_check"
        CHECK ("triageLevel" BETWEEN 1 AND 5),
    CONSTRAINT "emergency_triages_spo2_check"
        CHECK ("oxygenSaturation" IS NULL OR "oxygenSaturation" BETWEEN 0 AND 100)
);

CREATE TABLE "dialysis_sessions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sessionNo" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "admissionId" TEXT,
    "serviceId" TEXT NOT NULL,
    "status" "DialysisSessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "machine" TEXT,
    "notes" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "dialysis_sessions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "dialysis_sessions_time_check"
        CHECK ("completedAt" IS NULL OR "startedAt" IS NULL OR "completedAt" >= "startedAt")
);

CREATE UNIQUE INDEX "emergency_triages_tenantId_id_key"
    ON "emergency_triages"("tenantId", "id");
CREATE UNIQUE INDEX "emergency_triages_tenantId_triageNo_key"
    ON "emergency_triages"("tenantId", "triageNo");
CREATE UNIQUE INDEX "emergency_triages_tenantId_admissionId_key"
    ON "emergency_triages"("tenantId", "admissionId");
CREATE INDEX "emergency_triages_tenantId_status_triagedAt_idx"
    ON "emergency_triages"("tenantId", "status", "triagedAt");
CREATE INDEX "emergency_triages_tenantId_patientId_triagedAt_idx"
    ON "emergency_triages"("tenantId", "patientId", "triagedAt");

CREATE UNIQUE INDEX "dialysis_sessions_tenantId_id_key"
    ON "dialysis_sessions"("tenantId", "id");
CREATE UNIQUE INDEX "dialysis_sessions_tenantId_sessionNo_key"
    ON "dialysis_sessions"("tenantId", "sessionNo");
CREATE INDEX "dialysis_sessions_tenantId_patientId_scheduledAt_idx"
    ON "dialysis_sessions"("tenantId", "patientId", "scheduledAt");
CREATE INDEX "dialysis_sessions_tenantId_admissionId_status_idx"
    ON "dialysis_sessions"("tenantId", "admissionId", "status");

ALTER TABLE "emergency_triages"
    ADD CONSTRAINT "emergency_triages_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId")
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "emergency_triages_tenantId_patientId_fkey"
    FOREIGN KEY ("tenantId", "patientId") REFERENCES "patients"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "emergency_triages_tenantId_assignedDoctorId_fkey"
    FOREIGN KEY ("tenantId", "assignedDoctorId")
    REFERENCES "doctor_profiles"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "emergency_triages_tenantId_admissionId_fkey"
    FOREIGN KEY ("tenantId", "admissionId")
    REFERENCES "ipd_admissions"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "dialysis_sessions"
    ADD CONSTRAINT "dialysis_sessions_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId")
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "dialysis_sessions_tenantId_patientId_fkey"
    FOREIGN KEY ("tenantId", "patientId") REFERENCES "patients"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "dialysis_sessions_tenantId_admissionId_fkey"
    FOREIGN KEY ("tenantId", "admissionId")
    REFERENCES "ipd_admissions"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "dialysis_sessions_tenantId_serviceId_fkey"
    FOREIGN KEY ("tenantId", "serviceId")
    REFERENCES "service_masters"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
