/*
  Warnings:

  - You are about to drop the `audit_logs` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "audit_logs";

-- CreateTable
CREATE TABLE "doctor_profiles" (
    "id" TEXT NOT NULL,
    "hospitalId" INTEGER NOT NULL,
    "hospitalUserId" TEXT NOT NULL,
    "specialization" TEXT NOT NULL,
    "qualifications" TEXT,
    "consultationFee" DECIMAL(10,2) NOT NULL,
    "slotDurationMins" INTEGER NOT NULL DEFAULT 15,
    "bufferTimeMins" INTEGER NOT NULL DEFAULT 0,
    "maxPatientsPerDay" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_availabilities" (
    "id" TEXT NOT NULL,
    "hospitalId" INTEGER NOT NULL,
    "doctorProfileId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_availabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_leave_blocks" (
    "id" TEXT NOT NULL,
    "hospitalId" INTEGER NOT NULL,
    "doctorProfileId" TEXT NOT NULL,
    "blockDate" DATE NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doctor_leave_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "doctor_profiles_hospitalUserId_key" ON "doctor_profiles"("hospitalUserId");

-- CreateIndex
CREATE INDEX "doctor_profiles_hospitalId_idx" ON "doctor_profiles"("hospitalId");

-- CreateIndex
CREATE INDEX "doctor_availabilities_hospitalId_doctorProfileId_idx" ON "doctor_availabilities"("hospitalId", "doctorProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_availabilities_doctorProfileId_dayOfWeek_startTime_key" ON "doctor_availabilities"("doctorProfileId", "dayOfWeek", "startTime");

-- CreateIndex
CREATE INDEX "doctor_leave_blocks_hospitalId_doctorProfileId_blockDate_idx" ON "doctor_leave_blocks"("hospitalId", "doctorProfileId", "blockDate");

-- AddForeignKey
ALTER TABLE "doctor_profiles" ADD CONSTRAINT "doctor_profiles_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_profiles" ADD CONSTRAINT "doctor_profiles_hospitalUserId_fkey" FOREIGN KEY ("hospitalUserId") REFERENCES "hospital_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_availabilities" ADD CONSTRAINT "doctor_availabilities_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_availabilities" ADD CONSTRAINT "doctor_availabilities_doctorProfileId_fkey" FOREIGN KEY ("doctorProfileId") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_leave_blocks" ADD CONSTRAINT "doctor_leave_blocks_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_leave_blocks" ADD CONSTRAINT "doctor_leave_blocks_doctorProfileId_fkey" FOREIGN KEY ("doctorProfileId") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
