CREATE TYPE "IpdInvoiceType" AS ENUM ('INTERIM', 'FINAL', 'DIALYSIS_SESSION');
CREATE TYPE "IpdInvoiceStatus" AS ENUM (
    'GENERATED',
    'PARTIALLY_PAID',
    'PAID',
    'SETTLED'
);

CREATE TABLE "ipd_invoices" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceNo" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "patientUhidSnapshot" TEXT NOT NULL,
    "patientNameSnapshot" TEXT NOT NULL,
    "admissionId" TEXT,
    "invoiceType" "IpdInvoiceType" NOT NULL,
    "status" "IpdInvoiceStatus" NOT NULL DEFAULT 'GENERATED',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "dueAmount" DECIMAL(12,2) NOT NULL,
    "discountPct" DECIMAL(5,2),
    "discountReasonId" TEXT,
    "approvalAuthorityId" TEXT,
    "approvedByUserId" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ipd_invoices_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ipd_invoices_type_admission_check" CHECK (
        ("invoiceType" = 'DIALYSIS_SESSION' AND "admissionId" IS NULL) OR
        ("invoiceType" IN ('INTERIM', 'FINAL') AND "admissionId" IS NOT NULL)
    ),
    CONSTRAINT "ipd_invoices_amounts_check" CHECK (
        "subtotal" >= 0 AND "discountAmount" >= 0 AND
        "totalAmount" >= 0 AND "paidAmount" >= 0 AND
        "dueAmount" >= 0 AND "totalAmount" = "paidAmount" + "dueAmount"
    )
);

CREATE TABLE "ipd_invoice_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "chargeId" TEXT,
    "dialysisSessionId" TEXT,
    "serviceCodeSnapshot" TEXT NOT NULL,
    "serviceNameSnapshot" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitRate" DECIMAL(10,2) NOT NULL,
    "lineAmount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ipd_invoice_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ipd_invoice_items_source_check" CHECK (
        ("chargeId" IS NOT NULL AND "dialysisSessionId" IS NULL) OR
        ("chargeId" IS NULL AND "dialysisSessionId" IS NOT NULL)
    ),
    CONSTRAINT "ipd_invoice_items_amount_check" CHECK (
        "quantity" > 0 AND "unitRate" >= 0 AND "lineAmount" >= 0
    )
);

CREATE TABLE "ipd_payments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentMode" "PaymentMode" NOT NULL,
    "transactionId" TEXT,
    "notes" TEXT,
    "receivedBy" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ipd_payments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ipd_payments_amount_check" CHECK ("amount" > 0)
);

CREATE UNIQUE INDEX "ipd_invoices_tenantId_id_key"
    ON "ipd_invoices"("tenantId", "id");
CREATE UNIQUE INDEX "ipd_invoices_tenantId_invoiceNo_key"
    ON "ipd_invoices"("tenantId", "invoiceNo");
CREATE UNIQUE INDEX "ipd_invoices_one_final_per_admission_key"
    ON "ipd_invoices"("tenantId", "admissionId")
    WHERE "invoiceType" = 'FINAL';
CREATE INDEX "ipd_invoices_tenantId_patientId_createdAt_idx"
    ON "ipd_invoices"("tenantId", "patientId", "createdAt");
CREATE INDEX "ipd_invoices_tenantId_admissionId_invoiceType_idx"
    ON "ipd_invoices"("tenantId", "admissionId", "invoiceType");
CREATE INDEX "ipd_invoices_tenantId_status_createdAt_idx"
    ON "ipd_invoices"("tenantId", "status", "createdAt");

CREATE UNIQUE INDEX "ipd_invoice_items_tenantId_id_key"
    ON "ipd_invoice_items"("tenantId", "id");
CREATE UNIQUE INDEX "ipd_invoice_items_tenantId_chargeId_key"
    ON "ipd_invoice_items"("tenantId", "chargeId");
CREATE UNIQUE INDEX "ipd_invoice_items_tenantId_dialysisSessionId_key"
    ON "ipd_invoice_items"("tenantId", "dialysisSessionId");
CREATE INDEX "ipd_invoice_items_tenantId_invoiceId_idx"
    ON "ipd_invoice_items"("tenantId", "invoiceId");

CREATE UNIQUE INDEX "ipd_payments_tenantId_id_key"
    ON "ipd_payments"("tenantId", "id");
CREATE INDEX "ipd_payments_tenantId_invoiceId_receivedAt_idx"
    ON "ipd_payments"("tenantId", "invoiceId", "receivedAt");

ALTER TABLE "ipd_invoices"
    ADD CONSTRAINT "ipd_invoices_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId")
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "ipd_invoices_tenantId_patientId_fkey"
    FOREIGN KEY ("tenantId", "patientId") REFERENCES "patients"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "ipd_invoices_tenantId_admissionId_fkey"
    FOREIGN KEY ("tenantId", "admissionId")
    REFERENCES "ipd_admissions"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ipd_invoice_items"
    ADD CONSTRAINT "ipd_invoice_items_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId")
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "ipd_invoice_items_tenantId_invoiceId_fkey"
    FOREIGN KEY ("tenantId", "invoiceId")
    REFERENCES "ipd_invoices"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "ipd_invoice_items_tenantId_chargeId_fkey"
    FOREIGN KEY ("tenantId", "chargeId")
    REFERENCES "ipd_charges"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "ipd_invoice_items_tenantId_dialysisSessionId_fkey"
    FOREIGN KEY ("tenantId", "dialysisSessionId")
    REFERENCES "dialysis_sessions"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ipd_payments"
    ADD CONSTRAINT "ipd_payments_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId")
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "ipd_payments_tenantId_invoiceId_fkey"
    FOREIGN KEY ("tenantId", "invoiceId")
    REFERENCES "ipd_invoices"("tenantId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
