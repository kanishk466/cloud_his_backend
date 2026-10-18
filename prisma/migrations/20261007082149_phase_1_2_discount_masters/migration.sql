-- CreateTable
CREATE TABLE "discount_reasons" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "maxDiscountPercent" DECIMAL(5,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discount_reasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discount_approval_authorities" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "hospitalRoleId" INTEGER NOT NULL,
    "maxDiscountPercent" DECIMAL(5,2) NOT NULL,
    "maxDiscountAmount" DECIMAL(12,2),
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discount_approval_authorities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "discount_reasons_tenantId_idx" ON "discount_reasons"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "discount_reasons_tenantId_code_key" ON "discount_reasons"("tenantId", "code");

-- CreateIndex
CREATE INDEX "discount_approval_authorities_tenantId_idx" ON "discount_approval_authorities"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "discount_approval_authorities_tenantId_hospitalRoleId_key" ON "discount_approval_authorities"("tenantId", "hospitalRoleId");

-- AddForeignKey
ALTER TABLE "discount_reasons" ADD CONSTRAINT "discount_reasons_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_approval_authorities" ADD CONSTRAINT "discount_approval_authorities_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_approval_authorities" ADD CONSTRAINT "discount_approval_authorities_hospitalRoleId_fkey" FOREIGN KEY ("hospitalRoleId") REFERENCES "hospital_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
