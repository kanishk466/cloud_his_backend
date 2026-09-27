/*
  Warnings:

  - You are about to drop the column `investigationName` on the `investigation_orders` table. All the data in the column will be lost.
  - You are about to drop the column `consultationFee` on the `opd_bills` table. All the data in the column will be lost.
  - You are about to drop the column `otherCharges` on the `opd_bills` table. All the data in the column will be lost.
  - You are about to drop the column `registrationFee` on the `opd_bills` table. All the data in the column will be lost.
  - You are about to drop the column `companyName` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `coverage` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `insuranceProvider` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `medicalRegNo` on the `staff_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `qualification` on the `staff_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `specialization` on the `staff_profiles` table. All the data in the column will be lost.
  - Added the required column `serviceId` to the `investigation_orders` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "doctor_profiles" ADD COLUMN     "medicalRegNo" TEXT;

-- AlterTable
ALTER TABLE "investigation_orders" DROP COLUMN "investigationName",
ADD COLUMN     "serviceId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "opd_bills" DROP COLUMN "consultationFee",
DROP COLUMN "otherCharges",
DROP COLUMN "registrationFee";

-- AlterTable
ALTER TABLE "patients" DROP COLUMN "companyName",
DROP COLUMN "coverage",
DROP COLUMN "insuranceProvider",
ADD COLUMN     "panelId" TEXT,
ADD COLUMN     "panelPolicyNo" TEXT,
ADD COLUMN     "panelValidTill" DATE;

-- AlterTable
ALTER TABLE "staff_profiles" DROP COLUMN "medicalRegNo",
DROP COLUMN "qualification",
DROP COLUMN "specialization";

-- CreateIndex
CREATE INDEX "investigation_orders_tenantId_serviceId_idx" ON "investigation_orders"("tenantId", "serviceId");

-- CreateIndex
CREATE INDEX "patients_tenantId_panelId_idx" ON "patients"("tenantId", "panelId");

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES "panels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigation_orders" ADD CONSTRAINT "investigation_orders_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "service_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
