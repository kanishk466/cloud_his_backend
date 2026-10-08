-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "isFollowUpVisit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "referDoctorId" TEXT;

-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "referDoctorId" TEXT;

-- CreateTable
CREATE TABLE "referral_commissions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "referDoctorId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "patientId" TEXT NOT NULL,
    "billId" TEXT,
    "billAmount" DECIMAL(10,2) NOT NULL,
    "commissionRate" DECIMAL(5,2) NOT NULL,
    "commissionAmount" DECIMAL(10,2) NOT NULL,
    "proUserId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "settledAt" TIMESTAMP(3),
    "settledBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referral_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "referral_commissions_tenantId_referDoctorId_idx" ON "referral_commissions"("tenantId", "referDoctorId");

-- CreateIndex
CREATE INDEX "referral_commissions_tenantId_proUserId_idx" ON "referral_commissions"("tenantId", "proUserId");

-- CreateIndex
CREATE INDEX "referral_commissions_tenantId_status_idx" ON "referral_commissions"("tenantId", "status");

-- AddForeignKey
ALTER TABLE "referral_commissions" ADD CONSTRAINT "referral_commissions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_commissions" ADD CONSTRAINT "referral_commissions_referDoctorId_fkey" FOREIGN KEY ("referDoctorId") REFERENCES "refer_doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_referDoctorId_fkey" FOREIGN KEY ("referDoctorId") REFERENCES "refer_doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_referDoctorId_fkey" FOREIGN KEY ("referDoctorId") REFERENCES "refer_doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
