CREATE TYPE "LabCategory" AS ENUM ('LAB', 'RADIO');
CREATE TYPE "LabResultType" AS ENUM ('NUMERIC', 'TEXT', 'DROPDOWN');
CREATE TYPE "LabAgeUnit" AS ENUM ('YEARS', 'MONTHS');
CREATE TYPE "LabRangeGender" AS ENUM ('MALE', 'FEMALE', 'ANY');
CREATE TYPE "MicroMasterType" AS ENUM ('ORGANISM', 'ANTIBIOTIC', 'STAINING', 'COLONY_COUNT');

CREATE TABLE "lab_departments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "category" "LabCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "allowTemplates" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    CONSTRAINT "lab_departments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "investigations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "printOrder" INTEGER NOT NULL DEFAULT 0,
    "printSeparate" BOOLEAN NOT NULL DEFAULT false,
    "turnaroundTimeMins" INTEGER,
    "sampleTypeId" TEXT,
    "isOutsourced" BOOLEAN NOT NULL DEFAULT false,
    "outsourceLabId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    CONSTRAINT "investigations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "observations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "resultType" "LabResultType" NOT NULL DEFAULT 'NUMERIC',
    "formulaExpression" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    CONSTRAINT "observations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "investigation_observations" (
    "tenantId" TEXT NOT NULL,
    "investigationId" TEXT NOT NULL,
    "observationId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    CONSTRAINT "investigation_observations_pkey"
        PRIMARY KEY ("tenantId", "investigationId", "observationId")
);

CREATE TABLE "observation_reference_ranges" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "observationId" TEXT NOT NULL,
    "gender" "LabRangeGender" NOT NULL DEFAULT 'ANY',
    "minAge" INTEGER,
    "maxAge" INTEGER,
    "ageUnit" "LabAgeUnit" NOT NULL DEFAULT 'YEARS',
    "minValue" DECIMAL(12,4),
    "maxValue" DECIMAL(12,4),
    "panicLow" DECIMAL(12,4),
    "panicHigh" DECIMAL(12,4),
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    CONSTRAINT "observation_reference_ranges_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "investigation_templates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "investigationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    CONSTRAINT "investigation_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "interpretation_masters" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "observationId" TEXT,
    "title" TEXT,
    "bodyHtml" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    CONSTRAINT "interpretation_masters_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "help_observations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "observationId" TEXT NOT NULL,
    "helpText" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    CONSTRAINT "help_observations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lab_comments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "investigationId" TEXT,
    "commentText" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    CONSTRAINT "lab_comments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sample_containers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "sampleQuantityMl" DECIMAL(8,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    CONSTRAINT "sample_containers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sample_types" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "containerId" TEXT NOT NULL,
    "archiveDays" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    CONSTRAINT "sample_types_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "micro_masters" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "MicroMasterType" NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    CONSTRAINT "micro_masters_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "outsource_labs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "contactPerson" TEXT,
    "mobile" TEXT,
    "email" TEXT,
    "defaultTat" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    CONSTRAINT "outsource_labs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lab_approval_rights" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "departmentId" TEXT,
    "canSignLabReports" BOOLEAN NOT NULL DEFAULT false,
    "canSignRadioReports" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    CONSTRAINT "lab_approval_rights_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "lab_departments_tenantId_id_key" ON "lab_departments"("tenantId", "id");
CREATE UNIQUE INDEX "lab_departments_tenantId_category_name_key" ON "lab_departments"("tenantId", "category", "name");
CREATE INDEX "lab_departments_tenantId_category_isActive_deletedAt_idx" ON "lab_departments"("tenantId", "category", "isActive", "deletedAt");
CREATE UNIQUE INDEX "investigations_tenantId_id_key" ON "investigations"("tenantId", "id");
CREATE UNIQUE INDEX "investigations_tenantId_serviceId_key" ON "investigations"("tenantId", "serviceId");
CREATE UNIQUE INDEX "investigations_tenantId_code_key" ON "investigations"("tenantId", "code");
CREATE INDEX "investigations_tenantId_departmentId_isActive_deletedAt_idx" ON "investigations"("tenantId", "departmentId", "isActive", "deletedAt");
CREATE INDEX "investigations_tenantId_sampleTypeId_idx" ON "investigations"("tenantId", "sampleTypeId");
CREATE INDEX "investigations_tenantId_outsourceLabId_idx" ON "investigations"("tenantId", "outsourceLabId");
CREATE UNIQUE INDEX "observations_tenantId_id_key" ON "observations"("tenantId", "id");
CREATE UNIQUE INDEX "observations_tenantId_name_key" ON "observations"("tenantId", "name");
CREATE INDEX "observations_tenantId_resultType_isActive_deletedAt_idx" ON "observations"("tenantId", "resultType", "isActive", "deletedAt");
CREATE INDEX "investigation_observations_tenantId_investigationId_displayOrder_idx" ON "investigation_observations"("tenantId", "investigationId", "displayOrder");
CREATE INDEX "investigation_observations_tenantId_observationId_idx" ON "investigation_observations"("tenantId", "observationId");
CREATE UNIQUE INDEX "observation_reference_ranges_tenantId_id_key" ON "observation_reference_ranges"("tenantId", "id");
CREATE INDEX "observation_reference_ranges_tenantId_observationId_gender_ageUnit_isActive_idx" ON "observation_reference_ranges"("tenantId", "observationId", "gender", "ageUnit", "isActive");
CREATE UNIQUE INDEX "investigation_templates_tenantId_id_key" ON "investigation_templates"("tenantId", "id");
CREATE UNIQUE INDEX "investigation_templates_tenantId_investigationId_title_key" ON "investigation_templates"("tenantId", "investigationId", "title");
CREATE INDEX "investigation_templates_tenantId_investigationId_isDefault_isActive_idx" ON "investigation_templates"("tenantId", "investigationId", "isDefault", "isActive");
CREATE UNIQUE INDEX "interpretation_masters_tenantId_id_key" ON "interpretation_masters"("tenantId", "id");
CREATE INDEX "interpretation_masters_tenantId_observationId_isActive_idx" ON "interpretation_masters"("tenantId", "observationId", "isActive");
CREATE UNIQUE INDEX "help_observations_tenantId_id_key" ON "help_observations"("tenantId", "id");
CREATE INDEX "help_observations_tenantId_observationId_isDefault_isActive_idx" ON "help_observations"("tenantId", "observationId", "isDefault", "isActive");
CREATE UNIQUE INDEX "lab_comments_tenantId_id_key" ON "lab_comments"("tenantId", "id");
CREATE INDEX "lab_comments_tenantId_investigationId_isActive_idx" ON "lab_comments"("tenantId", "investigationId", "isActive");
CREATE UNIQUE INDEX "sample_containers_tenantId_id_key" ON "sample_containers"("tenantId", "id");
CREATE UNIQUE INDEX "sample_containers_tenantId_name_key" ON "sample_containers"("tenantId", "name");
CREATE INDEX "sample_containers_tenantId_isActive_deletedAt_idx" ON "sample_containers"("tenantId", "isActive", "deletedAt");
CREATE UNIQUE INDEX "sample_types_tenantId_id_key" ON "sample_types"("tenantId", "id");
CREATE UNIQUE INDEX "sample_types_tenantId_name_key" ON "sample_types"("tenantId", "name");
CREATE INDEX "sample_types_tenantId_containerId_isActive_deletedAt_idx" ON "sample_types"("tenantId", "containerId", "isActive", "deletedAt");
CREATE UNIQUE INDEX "micro_masters_tenantId_id_key" ON "micro_masters"("tenantId", "id");
CREATE UNIQUE INDEX "micro_masters_tenantId_type_name_key" ON "micro_masters"("tenantId", "type", "name");
CREATE INDEX "micro_masters_tenantId_type_isActive_deletedAt_idx" ON "micro_masters"("tenantId", "type", "isActive", "deletedAt");
CREATE UNIQUE INDEX "outsource_labs_tenantId_id_key" ON "outsource_labs"("tenantId", "id");
CREATE UNIQUE INDEX "outsource_labs_tenantId_name_key" ON "outsource_labs"("tenantId", "name");
CREATE INDEX "outsource_labs_tenantId_isActive_deletedAt_idx" ON "outsource_labs"("tenantId", "isActive", "deletedAt");
CREATE UNIQUE INDEX "lab_approval_rights_tenantId_id_key" ON "lab_approval_rights"("tenantId", "id");
CREATE UNIQUE INDEX "lab_approval_rights_tenantId_userId_departmentId_key" ON "lab_approval_rights"("tenantId", "userId", "departmentId");
CREATE INDEX "lab_approval_rights_tenantId_userId_isActive_deletedAt_idx" ON "lab_approval_rights"("tenantId", "userId", "isActive", "deletedAt");
CREATE INDEX "lab_approval_rights_tenantId_departmentId_isActive_idx" ON "lab_approval_rights"("tenantId", "departmentId", "isActive");

ALTER TABLE "lab_departments"
    ADD CONSTRAINT "lab_departments_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "investigations"
    ADD CONSTRAINT "investigations_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId")
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "investigations_tenantId_departmentId_fkey"
    FOREIGN KEY ("tenantId", "departmentId") REFERENCES "lab_departments"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "investigations_tenantId_serviceId_fkey"
    FOREIGN KEY ("tenantId", "serviceId") REFERENCES "service_masters"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "investigations_tenantId_sampleTypeId_fkey"
    FOREIGN KEY ("tenantId", "sampleTypeId") REFERENCES "sample_types"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "investigations_tenantId_outsourceLabId_fkey"
    FOREIGN KEY ("tenantId", "outsourceLabId") REFERENCES "outsource_labs"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "observations"
    ADD CONSTRAINT "observations_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "investigation_observations"
    ADD CONSTRAINT "investigation_observations_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId")
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "investigation_observations_tenantId_investigationId_fkey"
    FOREIGN KEY ("tenantId", "investigationId") REFERENCES "investigations"("tenantId", "id")
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "investigation_observations_tenantId_observationId_fkey"
    FOREIGN KEY ("tenantId", "observationId") REFERENCES "observations"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "observation_reference_ranges"
    ADD CONSTRAINT "observation_reference_ranges_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId")
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "observation_reference_ranges_tenantId_observationId_fkey"
    FOREIGN KEY ("tenantId", "observationId") REFERENCES "observations"("tenantId", "id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "investigation_templates"
    ADD CONSTRAINT "investigation_templates_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId")
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "investigation_templates_tenantId_investigationId_fkey"
    FOREIGN KEY ("tenantId", "investigationId") REFERENCES "investigations"("tenantId", "id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "interpretation_masters"
    ADD CONSTRAINT "interpretation_masters_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId")
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "interpretation_masters_tenantId_observationId_fkey"
    FOREIGN KEY ("tenantId", "observationId") REFERENCES "observations"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "help_observations"
    ADD CONSTRAINT "help_observations_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId")
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "help_observations_tenantId_observationId_fkey"
    FOREIGN KEY ("tenantId", "observationId") REFERENCES "observations"("tenantId", "id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lab_comments"
    ADD CONSTRAINT "lab_comments_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId")
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "lab_comments_tenantId_investigationId_fkey"
    FOREIGN KEY ("tenantId", "investigationId") REFERENCES "investigations"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sample_containers"
    ADD CONSTRAINT "sample_containers_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sample_types"
    ADD CONSTRAINT "sample_types_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId")
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "sample_types_tenantId_containerId_fkey"
    FOREIGN KEY ("tenantId", "containerId") REFERENCES "sample_containers"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "micro_masters"
    ADD CONSTRAINT "micro_masters_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outsource_labs"
    ADD CONSTRAINT "outsource_labs_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lab_approval_rights"
    ADD CONSTRAINT "lab_approval_rights_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId")
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "lab_approval_rights_tenantId_userId_fkey"
    FOREIGN KEY ("tenantId", "userId") REFERENCES "hospital_users"("tenantId", "id")
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "lab_approval_rights_tenantId_departmentId_fkey"
    FOREIGN KEY ("tenantId", "departmentId") REFERENCES "lab_departments"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
