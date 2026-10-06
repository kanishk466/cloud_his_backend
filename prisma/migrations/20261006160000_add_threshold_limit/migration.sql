-- CreateEnum
CREATE TYPE "ThresholdActionType" AS ENUM ('SOFT_WARNING', 'HARD_BLOCK');

-- CreateTable
CREATE TABLE "threshold_limits" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "panelId" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "thresholdAmount" DECIMAL(15,2) NOT NULL,
    "actionType" "ThresholdActionType" NOT NULL DEFAULT 'SOFT_WARNING',
    "alertEmails" TEXT[],
    "alertSmsNumbers" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "threshold_limits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "threshold_limits_tenantId_idx" ON "threshold_limits"("tenantId");

-- CreateIndex
CREATE INDEX "threshold_limits_tenantId_panelId_roomTypeId_isActive_idx" ON "threshold_limits"("tenantId", "panelId", "roomTypeId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "threshold_limits_tenantId_panelId_roomTypeId_key" ON "threshold_limits"("tenantId", "panelId", "roomTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "threshold_limits_tenantId_id_key" ON "threshold_limits"("tenantId", "id");

-- AddForeignKey
ALTER TABLE "threshold_limits" ADD CONSTRAINT "threshold_limits_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "threshold_limits" ADD CONSTRAINT "threshold_limits_tenantId_panelId_fkey" FOREIGN KEY ("tenantId", "panelId") REFERENCES "panels"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "threshold_limits" ADD CONSTRAINT "threshold_limits_tenantId_roomTypeId_fkey" FOREIGN KEY ("tenantId", "roomTypeId") REFERENCES "room_types"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
