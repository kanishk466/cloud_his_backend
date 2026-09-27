/*
  Warnings:

  - You are about to drop the column `breakEndTime` on the `doctor_availabilities` table. All the data in the column will be lost.
  - You are about to drop the column `breakStartTime` on the `doctor_availabilities` table. All the data in the column will be lost.
  - You are about to drop the column `bmi` on the `patient_vitals` table. All the data in the column will be lost.
  - You are about to drop the column `age` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `dosage` on the `prescriptions` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[doctorProfileId,dayOfWeek,startTime,endTime]` on the table `doctor_availabilities` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "doctor_availabilities_doctorProfileId_dayOfWeek_startTime_key";

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "patientId" TEXT;

-- AlterTable
ALTER TABLE "doctor_availabilities" DROP COLUMN "breakEndTime",
DROP COLUMN "breakStartTime";

-- AlterTable
ALTER TABLE "opd_bill_items" ADD COLUMN     "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "opd_payments" ADD COLUMN     "status" "PaymentStatus" NOT NULL DEFAULT 'PAID';

-- AlterTable
ALTER TABLE "patient_vitals" DROP COLUMN "bmi";

-- AlterTable
ALTER TABLE "patients" DROP COLUMN "age",
ADD COLUMN     "ageAtRegistration" INTEGER;

-- AlterTable
ALTER TABLE "prescriptions" DROP COLUMN "dosage",
ADD COLUMN     "doseAmount" DECIMAL(10,2),
ADD COLUMN     "doseUnit" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "doctor_availabilities_doctorProfileId_dayOfWeek_startTime_e_key" ON "doctor_availabilities"("doctorProfileId", "dayOfWeek", "startTime", "endTime");
