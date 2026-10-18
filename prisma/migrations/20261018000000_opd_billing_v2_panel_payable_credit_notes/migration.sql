-- ============================================
-- OPD BILLING V2 — counter + panel payable split, CREDIT payments,
-- audit-locked credit notes (refunds)
-- ============================================

-- 1. PaymentMode: add CREDIT (buy-now-pay-later corporate/OPD credit)
ALTER TYPE "PaymentMode" ADD VALUE 'CREDIT';

-- 2. opd_bills — new columns
ALTER TABLE "opd_bills" ADD COLUMN "doctorProfileId" TEXT;
ALTER TABLE "opd_bills" ADD COLUMN "visitNo" TEXT;
ALTER TABLE "opd_bills" ADD COLUMN "coPayPercent" DECIMAL(5,2) NOT NULL DEFAULT 0;
ALTER TABLE "opd_bills" ADD COLUMN "coPayAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "opd_bills" ADD COLUMN "patientPayable" DECIMAL(10,2);
ALTER TABLE "opd_bills" ADD COLUMN "panelPayable" DECIMAL(10,2);
ALTER TABLE "opd_bills" ADD COLUMN "changeAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "opd_bills" ADD COLUMN "remarks" TEXT;

-- 3. opd_bills — doctor FK + indexes
ALTER TABLE "opd_bills" ADD CONSTRAINT "opd_bills_doctorProfileId_fkey" FOREIGN KEY ("doctorProfileId") REFERENCES "doctor_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "opd_bills_tenantId_doctorProfileId_idx" ON "opd_bills"("tenantId", "doctorProfileId");
CREATE INDEX "opd_bills_tenantId_visitNo_idx" ON "opd_bills"("tenantId", "visitNo");

-- 4. Credit notes (refunds) — header
CREATE TABLE "opd_credit_notes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "creditNoteNo" TEXT NOT NULL,
    "refundAmount" DECIMAL(10,2) NOT NULL,
    "refundMode" "PaymentMode" NOT NULL DEFAULT 'CASH',
    "reason" TEXT NOT NULL,
    "originalReceiptNos" TEXT,
    "issuedBy" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "opd_credit_notes_pkey" PRIMARY KEY ("id")
);

-- 5. Credit notes — line items
CREATE TABLE "opd_credit_note_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "creditNoteId" TEXT NOT NULL,
    "billItemId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "refundAmount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "opd_credit_note_items_pkey" PRIMARY KEY ("id")
);

-- 6. Indexes
CREATE UNIQUE INDEX "opd_credit_notes_tenantId_creditNoteNo_key" ON "opd_credit_notes"("tenantId", "creditNoteNo");
CREATE INDEX "opd_credit_notes_tenantId_billId_idx" ON "opd_credit_notes"("tenantId", "billId");
CREATE INDEX "opd_credit_note_items_tenantId_creditNoteId_idx" ON "opd_credit_note_items"("tenantId", "creditNoteId");

-- 7. Foreign keys
ALTER TABLE "opd_credit_notes" ADD CONSTRAINT "opd_credit_notes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "opd_credit_notes" ADD CONSTRAINT "opd_credit_notes_billId_fkey" FOREIGN KEY ("billId") REFERENCES "opd_bills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "opd_credit_note_items" ADD CONSTRAINT "opd_credit_note_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "opd_credit_note_items" ADD CONSTRAINT "opd_credit_note_items_creditNoteId_fkey" FOREIGN KEY ("creditNoteId") REFERENCES "opd_credit_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "opd_credit_note_items" ADD CONSTRAINT "opd_credit_note_items_billItemId_fkey" FOREIGN KEY ("billItemId") REFERENCES "opd_bill_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
