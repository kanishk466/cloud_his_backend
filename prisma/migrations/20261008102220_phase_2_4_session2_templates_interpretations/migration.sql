-- CreateEnum
CREATE TYPE "TemplateType" AS ENUM ('NUMERIC_TABLE', 'DESCRIPTIVE', 'CULTURE_SENSITIVITY', 'FLOW_CYTOMETRY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "InterpretationCondition" AS ENUM ('ABOVE_MAX', 'BELOW_MIN', 'ABOVE_CRITICAL_HIGH', 'BELOW_CRITICAL_LOW', 'EQUALS', 'CONTAINS', 'IN_RANGE');

-- CreateTable
CREATE TABLE "report_templates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "labDepartmentId" TEXT,
    "investigationId" TEXT,
    "templateType" "TemplateType" NOT NULL DEFAULT 'NUMERIC_TABLE',
    "name" TEXT NOT NULL,
    "headerHtml" TEXT,
    "bodyHtml" TEXT,
    "footerHtml" TEXT,
    "cssStyles" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investigation_interpretations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "observationId" TEXT NOT NULL,
    "condition" "InterpretationCondition" NOT NULL,
    "thresholdValue" DECIMAL(10,4),
    "thresholdText" TEXT,
    "interpretationText" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investigation_interpretations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "observation_helps" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "observationId" TEXT NOT NULL,
    "helpTitle" TEXT NOT NULL,
    "helpText" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "observation_helps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_comments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "labDepartmentId" TEXT,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "commentText" TEXT NOT NULL,
    "shortcut" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "report_templates_tenantId_labDepartmentId_idx" ON "report_templates"("tenantId", "labDepartmentId");

-- CreateIndex
CREATE INDEX "report_templates_tenantId_investigationId_idx" ON "report_templates"("tenantId", "investigationId");

-- CreateIndex
CREATE INDEX "investigation_interpretations_tenantId_observationId_idx" ON "investigation_interpretations"("tenantId", "observationId");

-- CreateIndex
CREATE INDEX "observation_helps_tenantId_observationId_idx" ON "observation_helps"("tenantId", "observationId");

-- CreateIndex
CREATE INDEX "report_comments_tenantId_labDepartmentId_idx" ON "report_comments"("tenantId", "labDepartmentId");

-- CreateIndex
CREATE INDEX "report_comments_tenantId_category_idx" ON "report_comments"("tenantId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "report_comments_tenantId_shortcut_key" ON "report_comments"("tenantId", "shortcut");

-- AddForeignKey
ALTER TABLE "report_templates" ADD CONSTRAINT "report_templates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_templates" ADD CONSTRAINT "report_templates_labDepartmentId_fkey" FOREIGN KEY ("labDepartmentId") REFERENCES "lab_departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_templates" ADD CONSTRAINT "report_templates_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "investigations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigation_interpretations" ADD CONSTRAINT "investigation_interpretations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigation_interpretations" ADD CONSTRAINT "investigation_interpretations_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "observations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observation_helps" ADD CONSTRAINT "observation_helps_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observation_helps" ADD CONSTRAINT "observation_helps_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "observations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_comments" ADD CONSTRAINT "report_comments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_comments" ADD CONSTRAINT "report_comments_labDepartmentId_fkey" FOREIGN KEY ("labDepartmentId") REFERENCES "lab_departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
