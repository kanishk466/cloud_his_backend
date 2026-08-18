/*
  Warnings:

  - You are about to drop the column `actorEmail` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `actorId` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `detail` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `targetName` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `targetType` on the `audit_logs` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "HospitalUserType" ADD VALUE 'DOCTOR';

-- AlterTable
ALTER TABLE "audit_logs" DROP COLUMN "actorEmail",
DROP COLUMN "actorId",
DROP COLUMN "detail",
DROP COLUMN "targetName",
DROP COLUMN "targetType",
ADD COLUMN     "entity" TEXT,
ADD COLUMN     "entityId" TEXT,
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "tenantId" TEXT,
ADD COLUMN     "userAgent" TEXT,
ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE INDEX "audit_logs_tenantId_idx" ON "audit_logs"("tenantId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");
