CREATE TYPE "PanelRateType" AS ENUM ('OPD', 'IPD');
CREATE TYPE "PackageType" AS ENUM ('OPD', 'IPD');

ALTER TABLE "opd_bill_items"
    ADD COLUMN "rateScheduleId" TEXT,
    ADD COLUMN "rateEffectiveDate" DATE;

CREATE TABLE "rate_schedules" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "panelId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "rateType" "PanelRateType" NOT NULL,
    "validFrom" DATE NOT NULL,
    "validTo" DATE,
    "rate" DECIMAL(10,2) NOT NULL,
    "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "rate_schedules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "panel_documents" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "panelId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "documentUrl" TEXT NOT NULL,
    "mimeType" TEXT,
    "fileSizeBytes" INTEGER,
    "issuedAt" DATE,
    "expiresAt" DATE,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "panel_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "package_masters" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "packageCode" TEXT NOT NULL,
    "packageName" TEXT NOT NULL,
    "packageType" "PackageType" NOT NULL,
    "serviceId" TEXT,
    "validFrom" DATE,
    "validTo" DATE,
    "validityDays" INTEGER NOT NULL,
    "roomTypeId" TEXT,
    "includedStayDays" INTEGER,
    "basePackagePrice" DECIMAL(10,2) NOT NULL,
    "copaymentApplicable" BOOLEAN NOT NULL DEFAULT false,
    "showInPanel" BOOLEAN NOT NULL DEFAULT true,
    "cptCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "package_masters_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "package_components" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "package_components_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "package_doctor_consults" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "departmentId" INTEGER,
    "doctorId" TEXT,
    "allowedVisits" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "package_doctor_consults_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "package_exclusions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "package_exclusions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "package_consumptions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "billId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "package_consumptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "package_usages" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "consumptionId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "usedQuantity" INTEGER NOT NULL DEFAULT 1,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "billItemId" TEXT,
    CONSTRAINT "package_usages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "departments_tenantId_id_key" ON "departments"("tenantId", "id");
CREATE UNIQUE INDEX "service_masters_tenantId_id_key" ON "service_masters"("tenantId", "id");
CREATE UNIQUE INDEX "panels_tenantId_id_key" ON "panels"("tenantId", "id");
CREATE UNIQUE INDEX "opd_bills_tenantId_id_key" ON "opd_bills"("tenantId", "id");
CREATE UNIQUE INDEX "opd_bill_items_tenantId_id_key" ON "opd_bill_items"("tenantId", "id");

CREATE UNIQUE INDEX "rate_schedules_tenantId_id_key" ON "rate_schedules"("tenantId", "id");
CREATE INDEX "rate_schedules_tenantId_panelId_serviceId_rateType_validFrom_validTo_isActive_idx"
    ON "rate_schedules"("tenantId", "panelId", "serviceId", "rateType", "validFrom", "validTo", "isActive");
CREATE INDEX "panel_documents_tenantId_panelId_deletedAt_isActive_idx"
    ON "panel_documents"("tenantId", "panelId", "deletedAt", "isActive");
CREATE INDEX "panel_documents_tenantId_expiresAt_idx" ON "panel_documents"("tenantId", "expiresAt");

CREATE UNIQUE INDEX "package_masters_tenantId_packageCode_key"
    ON "package_masters"("tenantId", "packageCode");
CREATE UNIQUE INDEX "package_masters_serviceId_key" ON "package_masters"("serviceId");
CREATE UNIQUE INDEX "package_masters_tenantId_id_key" ON "package_masters"("tenantId", "id");
CREATE UNIQUE INDEX "package_masters_tenantId_serviceId_key"
    ON "package_masters"("tenantId", "serviceId");
CREATE INDEX "package_masters_tenantId_packageType_isActive_deletedAt_idx"
    ON "package_masters"("tenantId", "packageType", "isActive", "deletedAt");

CREATE UNIQUE INDEX "package_components_tenantId_packageId_serviceId_key"
    ON "package_components"("tenantId", "packageId", "serviceId");
CREATE INDEX "package_components_tenantId_serviceId_isActive_idx"
    ON "package_components"("tenantId", "serviceId", "isActive");
CREATE UNIQUE INDEX "package_doctor_consults_tenantId_packageId_departmentId_doctorId_key"
    ON "package_doctor_consults"("tenantId", "packageId", "departmentId", "doctorId");
CREATE INDEX "package_doctor_consults_tenantId_packageId_idx"
    ON "package_doctor_consults"("tenantId", "packageId");
CREATE UNIQUE INDEX "package_exclusions_tenantId_packageId_serviceId_key"
    ON "package_exclusions"("tenantId", "packageId", "serviceId");
CREATE INDEX "package_exclusions_tenantId_packageId_idx"
    ON "package_exclusions"("tenantId", "packageId");
CREATE UNIQUE INDEX "package_consumptions_tenantId_id_key"
    ON "package_consumptions"("tenantId", "id");
CREATE INDEX "package_consumptions_tenantId_patientId_isActive_expiresAt_idx"
    ON "package_consumptions"("tenantId", "patientId", "isActive", "expiresAt");
CREATE INDEX "package_usages_tenantId_consumptionId_serviceId_idx"
    ON "package_usages"("tenantId", "consumptionId", "serviceId");
CREATE INDEX "package_usages_tenantId_billItemId_idx"
    ON "package_usages"("tenantId", "billItemId");

ALTER TABLE "rate_schedules"
    ADD CONSTRAINT "rate_schedules_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId")
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "rate_schedules_tenantId_panelId_fkey"
    FOREIGN KEY ("tenantId", "panelId") REFERENCES "panels"("tenantId", "id")
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "rate_schedules_tenantId_serviceId_fkey"
    FOREIGN KEY ("tenantId", "serviceId") REFERENCES "service_masters"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "opd_bill_items"
    ADD CONSTRAINT "opd_bill_items_tenantId_rateScheduleId_fkey"
    FOREIGN KEY ("tenantId", "rateScheduleId") REFERENCES "rate_schedules"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "panel_documents"
    ADD CONSTRAINT "panel_documents_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId")
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "panel_documents_tenantId_panelId_fkey"
    FOREIGN KEY ("tenantId", "panelId") REFERENCES "panels"("tenantId", "id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "package_masters"
    ADD CONSTRAINT "package_masters_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId")
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "package_masters_tenantId_serviceId_fkey"
    FOREIGN KEY ("tenantId", "serviceId") REFERENCES "service_masters"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "package_masters_tenantId_roomTypeId_fkey"
    FOREIGN KEY ("tenantId", "roomTypeId") REFERENCES "room_types"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "package_components"
    ADD CONSTRAINT "package_components_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId")
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "package_components_tenantId_packageId_fkey"
    FOREIGN KEY ("tenantId", "packageId") REFERENCES "package_masters"("tenantId", "id")
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "package_components_tenantId_serviceId_fkey"
    FOREIGN KEY ("tenantId", "serviceId") REFERENCES "service_masters"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "package_doctor_consults"
    ADD CONSTRAINT "package_doctor_consults_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId")
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "package_doctor_consults_tenantId_packageId_fkey"
    FOREIGN KEY ("tenantId", "packageId") REFERENCES "package_masters"("tenantId", "id")
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "package_doctor_consults_tenantId_departmentId_fkey"
    FOREIGN KEY ("tenantId", "departmentId") REFERENCES "departments"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "package_doctor_consults_tenantId_doctorId_fkey"
    FOREIGN KEY ("tenantId", "doctorId") REFERENCES "doctor_profiles"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "package_exclusions"
    ADD CONSTRAINT "package_exclusions_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId")
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "package_exclusions_tenantId_packageId_fkey"
    FOREIGN KEY ("tenantId", "packageId") REFERENCES "package_masters"("tenantId", "id")
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "package_exclusions_tenantId_serviceId_fkey"
    FOREIGN KEY ("tenantId", "serviceId") REFERENCES "service_masters"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "package_consumptions"
    ADD CONSTRAINT "package_consumptions_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId")
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "package_consumptions_tenantId_patientId_fkey"
    FOREIGN KEY ("tenantId", "patientId") REFERENCES "patients"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "package_consumptions_tenantId_packageId_fkey"
    FOREIGN KEY ("tenantId", "packageId") REFERENCES "package_masters"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "package_consumptions_tenantId_billId_fkey"
    FOREIGN KEY ("tenantId", "billId") REFERENCES "opd_bills"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "package_usages"
    ADD CONSTRAINT "package_usages_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId")
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "package_usages_tenantId_consumptionId_fkey"
    FOREIGN KEY ("tenantId", "consumptionId") REFERENCES "package_consumptions"("tenantId", "id")
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "package_usages_tenantId_serviceId_fkey"
    FOREIGN KEY ("tenantId", "serviceId") REFERENCES "service_masters"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "package_usages_tenantId_billItemId_fkey"
    FOREIGN KEY ("tenantId", "billItemId") REFERENCES "opd_bill_items"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
