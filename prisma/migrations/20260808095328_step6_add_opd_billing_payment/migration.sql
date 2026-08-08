-- CreateTable
CREATE TABLE "opd_bills" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "billNo" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "consultationFee" DECIMAL(10,2) NOT NULL,
    "registrationFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "otherCharges" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "taxPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "dueAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMode" "PaymentMode",
    "billStatus" "BillStatus" NOT NULL DEFAULT 'DRAFT',
    "isInsurance" BOOLEAN NOT NULL DEFAULT false,
    "insuranceProvider" TEXT,
    "insurancePolicyNo" TEXT,
    "insuranceClaimed" DECIMAL(10,2),
    "insuranceApproved" DECIMAL(10,2),
    "discountReason" TEXT,
    "discountAuthorizedBy" TEXT,
    "generatedBy" TEXT,
    "billedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opd_bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opd_payments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "receiptNo" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentMode" "PaymentMode" NOT NULL,
    "transactionId" TEXT,
    "receivedBy" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "opd_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "opd_bills_appointmentId_key" ON "opd_bills"("appointmentId");

-- CreateIndex
CREATE INDEX "opd_bills_tenantId_patientId_idx" ON "opd_bills"("tenantId", "patientId");

-- CreateIndex
CREATE INDEX "opd_bills_tenantId_billStatus_idx" ON "opd_bills"("tenantId", "billStatus");

-- CreateIndex
CREATE INDEX "opd_bills_tenantId_billedAt_idx" ON "opd_bills"("tenantId", "billedAt");

-- CreateIndex
CREATE INDEX "opd_bills_tenantId_paymentStatus_idx" ON "opd_bills"("tenantId", "paymentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "opd_bills_tenantId_billNo_key" ON "opd_bills"("tenantId", "billNo");

-- CreateIndex
CREATE INDEX "opd_payments_tenantId_billId_idx" ON "opd_payments"("tenantId", "billId");

-- CreateIndex
CREATE UNIQUE INDEX "opd_payments_tenantId_receiptNo_key" ON "opd_payments"("tenantId", "receiptNo");

-- AddForeignKey
ALTER TABLE "opd_bills" ADD CONSTRAINT "opd_bills_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opd_bills" ADD CONSTRAINT "opd_bills_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opd_bills" ADD CONSTRAINT "opd_bills_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opd_payments" ADD CONSTRAINT "opd_payments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opd_payments" ADD CONSTRAINT "opd_payments_billId_fkey" FOREIGN KEY ("billId") REFERENCES "opd_bills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
