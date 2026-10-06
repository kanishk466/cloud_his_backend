CREATE TYPE "ServiceConfigType" AS ENUM (
    'ADMISSION',
    'INVESTIGATION',
    'OPD',
    'IPD',
    'OT',
    'EMERGENCY',
    'PHARMACY',
    'PROCEDURE',
    'OTHER'
);

CREATE TYPE "ServiceStoreType" AS ENUM ('NONE', 'MEDICAL', 'GENERAL');

CREATE TABLE "service_item_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "service_item_types_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_categories" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "configType" "ServiceConfigType" NOT NULL,
    "categoryName" TEXT NOT NULL,
    "storeType" "ServiceStoreType" NOT NULL DEFAULT 'NONE',
    "abbreviation" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "service_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_sub_categories" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "subCategoryName" TEXT NOT NULL,
    "displayName" TEXT,
    "printOrder" INTEGER NOT NULL DEFAULT 0,
    "abbreviation" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "service_sub_categories_pkey" PRIMARY KEY ("id")
);

INSERT INTO "service_item_types" ("id", "code", "name", "isSystem", "updatedAt")
VALUES
    (gen_random_uuid()::text, 'SERVICE', 'Service', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'MEDICINE', 'Medicine', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'CONSUMABLE', 'Consumable', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'PACKAGE', 'Package', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'ROOM', 'Room', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'PROCEDURE', 'Procedure', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'INVESTIGATION', 'Investigation', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'OT_CHARGE', 'OT Charge', true, CURRENT_TIMESTAMP);

INSERT INTO "service_categories"
    ("id", "tenantId", "configType", "categoryName", "storeType", "abbreviation", "updatedAt")
SELECT
    gen_random_uuid()::text,
    existing."tenantId",
    CASE existing."category"::text
        WHEN 'CONSULTATION' THEN 'OPD'::"ServiceConfigType"
        WHEN 'LAB' THEN 'INVESTIGATION'::"ServiceConfigType"
        WHEN 'RADIOLOGY' THEN 'INVESTIGATION'::"ServiceConfigType"
        WHEN 'PROCEDURE' THEN 'PROCEDURE'::"ServiceConfigType"
        WHEN 'PHARMACY' THEN 'PHARMACY'::"ServiceConfigType"
        WHEN 'BED_CHARGE' THEN 'IPD'::"ServiceConfigType"
        ELSE 'OTHER'::"ServiceConfigType"
    END,
    INITCAP(REPLACE(existing."category"::text, '_', ' ')),
    'NONE'::"ServiceStoreType",
    existing."category"::text,
    CURRENT_TIMESTAMP
FROM (
    SELECT DISTINCT "tenantId", "category"
    FROM "service_masters"
) AS existing;

ALTER TABLE "opd_bill_items"
    ADD COLUMN "serviceMasterId" TEXT,
    ADD COLUMN "cptCode" TEXT,
    ADD COLUMN "isInsuranceClaimItem" BOOLEAN,
    ADD COLUMN "serviceDiscountable" BOOLEAN,
    ADD COLUMN "serviceRateEditable" BOOLEAN,
    ADD COLUMN "serviceStoreType" "ServiceStoreType",
    ADD COLUMN "serviceItemTypeCode" TEXT,
    ADD COLUMN "servicePrintOrder" INTEGER,
    ADD COLUMN "billLineOrder" INTEGER NOT NULL DEFAULT 0;

WITH ordered_items AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (
            PARTITION BY "billId"
            ORDER BY "createdAt", "id"
        ) - 1 AS "lineOrder"
    FROM "opd_bill_items"
)
UPDATE "opd_bill_items" AS bill_item
SET "billLineOrder" = ordered_items."lineOrder"::INTEGER
FROM ordered_items
WHERE bill_item."id" = ordered_items."id";

CREATE INDEX "opd_bill_items_tenantId_serviceMasterId_idx"
    ON "opd_bill_items"("tenantId", "serviceMasterId");

ALTER TABLE "opd_bill_items"
    ADD CONSTRAINT "opd_bill_items_tenantId_serviceMasterId_fkey"
    FOREIGN KEY ("serviceMasterId") REFERENCES "service_masters"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "service_masters"
    ADD COLUMN "categoryId" TEXT,
    ADD COLUMN "subCategoryId" TEXT,
    ADD COLUMN "itemTypeId" TEXT,
    ADD COLUMN "displayName" TEXT,
    ADD COLUMN "cptCode" TEXT,
    ADD COLUMN "isInsuranceClaimItem" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "rateEditable" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN "discountable" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN "purchaseTaxPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    ADD COLUMN "saleTaxPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    ADD COLUMN "itemUom" TEXT,
    ADD COLUMN "applicableGender" "Gender",
    ADD COLUMN "minAge" INTEGER,
    ADD COLUMN "maxAge" INTEGER;

UPDATE "service_masters" AS service
SET "categoryId" = category."id",
    "itemTypeId" = item_type."id"
FROM "service_categories" AS category,
     "service_item_types" AS item_type
WHERE category."tenantId" = service."tenantId"
  AND category."categoryName" = INITCAP(REPLACE(service."category"::text, '_', ' '))
  AND category."configType" = CASE service."category"::text
      WHEN 'CONSULTATION' THEN 'OPD'::"ServiceConfigType"
      WHEN 'LAB' THEN 'INVESTIGATION'::"ServiceConfigType"
      WHEN 'RADIOLOGY' THEN 'INVESTIGATION'::"ServiceConfigType"
      WHEN 'PROCEDURE' THEN 'PROCEDURE'::"ServiceConfigType"
      WHEN 'PHARMACY' THEN 'PHARMACY'::"ServiceConfigType"
      WHEN 'BED_CHARGE' THEN 'IPD'::"ServiceConfigType"
      ELSE 'OTHER'::"ServiceConfigType"
  END
  AND item_type."code" = CASE service."category"::text
      WHEN 'LAB' THEN 'INVESTIGATION'
      WHEN 'RADIOLOGY' THEN 'INVESTIGATION'
      WHEN 'PROCEDURE' THEN 'PROCEDURE'
      WHEN 'PHARMACY' THEN 'MEDICINE'
      WHEN 'BED_CHARGE' THEN 'ROOM'
      ELSE 'SERVICE'
  END;

CREATE UNIQUE INDEX "service_item_types_code_key" ON "service_item_types"("code");
CREATE INDEX "service_item_types_isActive_deletedAt_idx" ON "service_item_types"("isActive", "deletedAt");
CREATE UNIQUE INDEX "service_categories_tenantId_configType_categoryName_key"
    ON "service_categories"("tenantId", "configType", "categoryName");
CREATE INDEX "service_categories_tenantId_deletedAt_idx"
    ON "service_categories"("tenantId", "deletedAt");
CREATE INDEX "service_categories_tenantId_configType_isActive_idx"
    ON "service_categories"("tenantId", "configType", "isActive");
CREATE UNIQUE INDEX "service_sub_categories_categoryId_subCategoryName_key"
    ON "service_sub_categories"("categoryId", "subCategoryName");
CREATE INDEX "service_sub_categories_tenantId_categoryId_deletedAt_idx"
    ON "service_sub_categories"("tenantId", "categoryId", "deletedAt");
CREATE INDEX "service_sub_categories_tenantId_categoryId_printOrder_idx"
    ON "service_sub_categories"("tenantId", "categoryId", "printOrder");
CREATE INDEX "service_masters_tenantId_categoryId_subCategoryId_idx"
    ON "service_masters"("tenantId", "categoryId", "subCategoryId");
CREATE INDEX "service_masters_tenantId_itemTypeId_isActive_idx"
    ON "service_masters"("tenantId", "itemTypeId", "isActive");

ALTER TABLE "service_categories"
    ADD CONSTRAINT "service_categories_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_sub_categories"
    ADD CONSTRAINT "service_sub_categories_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId")
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "service_sub_categories_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "service_categories"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_masters"
    ADD CONSTRAINT "service_masters_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "service_categories"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "service_masters_subCategoryId_fkey"
    FOREIGN KEY ("subCategoryId") REFERENCES "service_sub_categories"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "service_masters_itemTypeId_fkey"
    FOREIGN KEY ("itemTypeId") REFERENCES "service_item_types"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
