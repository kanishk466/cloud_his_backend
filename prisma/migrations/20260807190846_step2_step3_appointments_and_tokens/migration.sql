/*
  Warnings:

  - You are about to drop the column `hospitalId` on the `hospital_users` table. All the data in the column will be lost.
  - You are about to drop the `hospital_user_hospitals` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "hospital_user_hospitals" DROP CONSTRAINT "hospital_user_hospitals_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "hospital_user_hospitals" DROP CONSTRAINT "hospital_user_hospitals_userId_fkey";

-- DropForeignKey
ALTER TABLE "hospital_users" DROP CONSTRAINT "hospital_users_hospitalId_fkey";

-- AlterTable
ALTER TABLE "hospital_users" DROP COLUMN "hospitalId";

-- DropTable
DROP TABLE "hospital_user_hospitals";

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "appointmentNo" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorProfileId" TEXT NOT NULL,
    "departmentId" INTEGER,
    "appointmentDate" DATE NOT NULL,
    "slotStartTime" TEXT,
    "slotEndTime" TEXT,
    "appointmentType" "AppointmentType" NOT NULL DEFAULT 'WALK_IN',
    "visitType" "VisitType" NOT NULL DEFAULT 'NEW_VISIT',
    "status" "AppointmentStatus" NOT NULL DEFAULT 'BOOKED',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "consultationFee" DECIMAL(10,2) NOT NULL,
    "referredByDoctorName" TEXT,
    "referralNote" TEXT,
    "reasonForVisit" TEXT,
    "notes" TEXT,
    "bookedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bookedBy" TEXT,
    "checkedInAt" TIMESTAMP(3),
    "checkedInBy" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "cancelledBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opd_tokens" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "doctorProfileId" TEXT NOT NULL,
    "tokenNumber" INTEGER NOT NULL,
    "tokenDate" DATE NOT NULL,
    "status" "TokenStatus" NOT NULL DEFAULT 'WAITING',
    "originalPosition" INTEGER,
    "estimatedTime" TEXT,
    "calledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "roomNo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opd_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "appointments_tenantId_appointmentDate_idx" ON "appointments"("tenantId", "appointmentDate");

-- CreateIndex
CREATE INDEX "appointments_tenantId_doctorProfileId_appointmentDate_idx" ON "appointments"("tenantId", "doctorProfileId", "appointmentDate");

-- CreateIndex
CREATE INDEX "appointments_tenantId_patientId_idx" ON "appointments"("tenantId", "patientId");

-- CreateIndex
CREATE INDEX "appointments_tenantId_status_idx" ON "appointments"("tenantId", "status");

-- CreateIndex
CREATE INDEX "appointments_tenantId_doctorProfileId_appointmentDate_slotS_idx" ON "appointments"("tenantId", "doctorProfileId", "appointmentDate", "slotStartTime");

-- CreateIndex
CREATE INDEX "appointments_tenantId_deletedAt_idx" ON "appointments"("tenantId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_tenantId_appointmentNo_key" ON "appointments"("tenantId", "appointmentNo");

-- CreateIndex
CREATE UNIQUE INDEX "opd_tokens_appointmentId_key" ON "opd_tokens"("appointmentId");

-- CreateIndex
CREATE INDEX "opd_tokens_tenantId_doctorProfileId_tokenDate_idx" ON "opd_tokens"("tenantId", "doctorProfileId", "tokenDate");

-- CreateIndex
CREATE INDEX "opd_tokens_tenantId_status_idx" ON "opd_tokens"("tenantId", "status");

-- CreateIndex
CREATE INDEX "opd_tokens_tenantId_tokenDate_idx" ON "opd_tokens"("tenantId", "tokenDate");

-- CreateIndex
CREATE UNIQUE INDEX "opd_tokens_tenantId_doctorProfileId_tokenDate_tokenNumber_key" ON "opd_tokens"("tenantId", "doctorProfileId", "tokenDate", "tokenNumber");

-- AddForeignKey
ALTER TABLE "hospital_users" ADD CONSTRAINT "hospital_users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctorProfileId_fkey" FOREIGN KEY ("doctorProfileId") REFERENCES "doctor_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opd_tokens" ADD CONSTRAINT "opd_tokens_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opd_tokens" ADD CONSTRAINT "opd_tokens_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opd_tokens" ADD CONSTRAINT "opd_tokens_doctorProfileId_fkey" FOREIGN KEY ("doctorProfileId") REFERENCES "doctor_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
