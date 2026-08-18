-- CreateTable
CREATE TABLE "patient_uhid_sequences" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_uhid_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "patient_uhid_sequences_tenant_id_idx" ON "patient_uhid_sequences"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "patient_uhid_sequences_tenant_id_year_key" ON "patient_uhid_sequences"("tenant_id", "year");

-- AddForeignKey
ALTER TABLE "patient_uhid_sequences" ADD CONSTRAINT "patient_uhid_sequences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;
