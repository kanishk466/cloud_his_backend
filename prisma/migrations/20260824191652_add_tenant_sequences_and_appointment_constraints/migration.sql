/*
  Warnings:

  - You are about to drop the `hospital_password_history` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `platform_password_history` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[tenantId,id]` on the table `appointments` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "hospital_password_history" DROP CONSTRAINT "hospital_password_history_user_id_fkey";

-- DropForeignKey
ALTER TABLE "platform_password_history" DROP CONSTRAINT "platform_password_history_user_id_fkey";

-- DropTable
DROP TABLE "hospital_password_history";

-- DropTable
DROP TABLE "platform_password_history";

-- CreateTable
CREATE TABLE "tenant_sequences" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "scope_key" TEXT NOT NULL,
    "last_value" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tenant_sequences_tenant_id_entity_type_idx" ON "tenant_sequences"("tenant_id", "entity_type");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_sequences_tenant_id_entity_type_scope_key_key" ON "tenant_sequences"("tenant_id", "entity_type", "scope_key");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_tenantId_id_key" ON "appointments"("tenantId", "id");

-- AddForeignKey
ALTER TABLE "tenant_sequences" ADD CONSTRAINT "tenant_sequences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;
