-- CreateEnum
CREATE TYPE "DiscountApplicableType" AS ENUM ('OPD', 'IPD', 'BOTH');

-- CreateTable
CREATE TABLE "discount_reasons" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "applicableType" "DiscountApplicableType" NOT NULL DEFAULT 'BOTH',
    "defaultDiscountPct" DECIMAL(5,2),
    "approvalThresholdPct" DECIMAL(5,2),
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "discount_reasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discount_approval_authorities" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "authorityName" TEXT NOT NULL,
    "hospitalUserId" TEXT,
    "applicableType" "DiscountApplicableType" NOT NULL DEFAULT 'BOTH',
    "maxDiscountPct" DECIMAL(5,2) NOT NULL,
    "maxDiscountAmount" DECIMAL(12,2),
    "isUnlimited" BOOLEAN NOT NULL DEFAULT false,
    "requiresReason" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "discount_approval_authorities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discount_audit_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "module" "DiscountApplicableType" NOT NULL,
    "referenceType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "discountReasonId" TEXT NOT NULL,
    "approvalAuthorityId" TEXT,
    "discountPct" DECIMAL(5,2) NOT NULL,
    "discountAmount" DECIMAL(12,2) NOT NULL,
    "originalAmount" DECIMAL(12,2) NOT NULL,
    "finalAmount" DECIMAL(12,2) NOT NULL,
    "approvedByUserId" TEXT,
    "appliedByUserId" TEXT NOT NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discount_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "discount_reasons_tenantId_idx" ON "discount_reasons"("tenantId");

-- CreateIndex
CREATE INDEX "discount_reasons_tenantId_deletedAt_idx" ON "discount_reasons"("tenantId", "deletedAt");

-- CreateIndex
CREATE INDEX "discount_reasons_tenantId_applicableType_isActive_idx" ON "discount_reasons"("tenantId", "applicableType", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "discount_reasons_tenantId_code_key" ON "discount_reasons"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "discount_reasons_tenantId_reason_deletedAt_key" ON "discount_reasons"("tenantId", "reason", "deletedAt");

-- CreateIndex
CREATE INDEX "discount_approval_authorities_tenantId_idx" ON "discount_approval_authorities"("tenantId");

-- CreateIndex
CREATE INDEX "discount_approval_authorities_tenantId_deletedAt_idx" ON "discount_approval_authorities"("tenantId", "deletedAt");

-- CreateIndex
CREATE INDEX "discount_approval_authorities_tenantId_applicableType_isAct_idx" ON "discount_approval_authorities"("tenantId", "applicableType", "isActive");

-- CreateIndex
CREATE INDEX "discount_approval_authorities_tenantId_hospitalUserId_idx" ON "discount_approval_authorities"("tenantId", "hospitalUserId");

-- CreateIndex
CREATE UNIQUE INDEX "discount_approval_authorities_tenantId_code_key" ON "discount_approval_authorities"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "discount_approval_authorities_tenantId_authorityName_delete_key" ON "discount_approval_authorities"("tenantId", "authorityName", "deletedAt");

-- CreateIndex
CREATE INDEX "discount_audit_logs_tenantId_idx" ON "discount_audit_logs"("tenantId");

-- CreateIndex
CREATE INDEX "discount_audit_logs_tenantId_referenceType_referenceId_idx" ON "discount_audit_logs"("tenantId", "referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "discount_audit_logs_tenantId_discountReasonId_idx" ON "discount_audit_logs"("tenantId", "discountReasonId");

-- CreateIndex
CREATE INDEX "discount_audit_logs_tenantId_approvalAuthorityId_idx" ON "discount_audit_logs"("tenantId", "approvalAuthorityId");

-- CreateIndex
CREATE INDEX "discount_audit_logs_tenantId_appliedByUserId_idx" ON "discount_audit_logs"("tenantId", "appliedByUserId");

-- CreateIndex
CREATE INDEX "discount_audit_logs_tenantId_createdAt_idx" ON "discount_audit_logs"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "discount_reasons" ADD CONSTRAINT "discount_reasons_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_approval_authorities" ADD CONSTRAINT "discount_approval_authorities_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_approval_authorities" ADD CONSTRAINT "discount_approval_authorities_hospitalUserId_fkey" FOREIGN KEY ("hospitalUserId") REFERENCES "hospital_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_audit_logs" ADD CONSTRAINT "discount_audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_audit_logs" ADD CONSTRAINT "discount_audit_logs_discountReasonId_fkey" FOREIGN KEY ("discountReasonId") REFERENCES "discount_reasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_audit_logs" ADD CONSTRAINT "discount_audit_logs_approvalAuthorityId_fkey" FOREIGN KEY ("approvalAuthorityId") REFERENCES "discount_approval_authorities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
