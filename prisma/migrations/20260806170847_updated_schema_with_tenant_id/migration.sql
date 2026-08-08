/*
  Warnings:

  - You are about to drop the column `hospitalCode` on the `assigned_packages` table. All the data in the column will be lost.
  - You are about to drop the column `hospitalCode` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `hospitalCode` on the `departments` table. All the data in the column will be lost.
  - You are about to drop the column `hospitalCode` on the `doctor_availabilities` table. All the data in the column will be lost.
  - You are about to drop the column `hospitalCode` on the `doctor_leave_blocks` table. All the data in the column will be lost.
  - You are about to drop the column `hospitalCode` on the `doctor_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `hospitalCode` on the `hospital_roles` table. All the data in the column will be lost.
  - You are about to drop the column `hospitalCode` on the `hospital_users` table. All the data in the column will be lost.
  - You are about to drop the column `hospitalCode` on the `permission_copy_logs` table. All the data in the column will be lost.
  - You are about to drop the column `createdByHospitalCode` on the `role_names` table. All the data in the column will be lost.
  - You are about to drop the column `hospitalCode` on the `shift_masters` table. All the data in the column will be lost.
  - You are about to drop the column `hospitalCode` on the `staff_profiles` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[tenantId,name]` on the table `departments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenantId,roleNameId]` on the table `hospital_roles` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenantId,username]` on the table `hospital_users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenantId,email]` on the table `hospital_users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenantId]` on the table `hospitals` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenantId,name]` on the table `shift_masters` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenantId,employeeId]` on the table `staff_profiles` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tenantId` to the `assigned_packages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `departments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `doctor_availabilities` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `doctor_leave_blocks` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `doctor_profiles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `hospital_roles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `hospital_users` table without a default value. This is not possible if the table is not empty.
  - The required column `tenantId` was added to the `hospitals` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `tenantId` to the `permission_copy_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `shift_masters` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `staff_profiles` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "assigned_packages" DROP CONSTRAINT "assigned_packages_hospitalCode_fkey";

-- DropForeignKey
ALTER TABLE "departments" DROP CONSTRAINT "departments_hospitalCode_fkey";

-- DropForeignKey
ALTER TABLE "doctor_availabilities" DROP CONSTRAINT "doctor_availabilities_hospitalCode_fkey";

-- DropForeignKey
ALTER TABLE "doctor_leave_blocks" DROP CONSTRAINT "doctor_leave_blocks_hospitalCode_fkey";

-- DropForeignKey
ALTER TABLE "doctor_profiles" DROP CONSTRAINT "doctor_profiles_hospitalCode_fkey";

-- DropForeignKey
ALTER TABLE "hospital_roles" DROP CONSTRAINT "hospital_roles_hospitalCode_fkey";

-- DropForeignKey
ALTER TABLE "hospital_users" DROP CONSTRAINT "hospital_users_hospitalCode_fkey";

-- DropForeignKey
ALTER TABLE "permission_copy_logs" DROP CONSTRAINT "permission_copy_logs_hospitalCode_fkey";

-- DropForeignKey
ALTER TABLE "role_names" DROP CONSTRAINT "role_names_createdByHospitalCode_fkey";

-- DropForeignKey
ALTER TABLE "shift_masters" DROP CONSTRAINT "shift_masters_hospitalCode_fkey";

-- DropIndex
DROP INDEX "assigned_packages_hospitalCode_idx";

-- DropIndex
DROP INDEX "audit_logs_hospitalCode_idx";

-- DropIndex
DROP INDEX "departments_hospitalCode_idx";

-- DropIndex
DROP INDEX "departments_hospitalCode_name_key";

-- DropIndex
DROP INDEX "doctor_availabilities_hospitalCode_doctorProfileId_idx";

-- DropIndex
DROP INDEX "doctor_leave_blocks_hospitalCode_doctorProfileId_blockDate_idx";

-- DropIndex
DROP INDEX "doctor_profiles_hospitalCode_idx";

-- DropIndex
DROP INDEX "hospital_roles_hospitalCode_idx";

-- DropIndex
DROP INDEX "hospital_roles_hospitalCode_roleNameId_key";

-- DropIndex
DROP INDEX "hospital_users_hospitalCode_email_key";

-- DropIndex
DROP INDEX "hospital_users_hospitalCode_idx";

-- DropIndex
DROP INDEX "hospital_users_hospitalCode_username_key";

-- DropIndex
DROP INDEX "permission_copy_logs_hospitalCode_idx";

-- DropIndex
DROP INDEX "shift_masters_hospitalCode_idx";

-- DropIndex
DROP INDEX "shift_masters_hospitalCode_name_key";

-- DropIndex
DROP INDEX "staff_profiles_hospitalCode_employeeId_key";

-- DropIndex
DROP INDEX "staff_profiles_hospitalCode_idx";

-- AlterTable
ALTER TABLE "assigned_packages" DROP COLUMN "hospitalCode",
ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "audit_logs" DROP COLUMN "hospitalCode",
ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "departments" DROP COLUMN "hospitalCode",
ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "doctor_availabilities" DROP COLUMN "hospitalCode",
ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "doctor_leave_blocks" DROP COLUMN "hospitalCode",
ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "doctor_profiles" DROP COLUMN "hospitalCode",
ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "hospital_roles" DROP COLUMN "hospitalCode",
ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "hospital_users" DROP COLUMN "hospitalCode",
ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "hospitals" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "permission_copy_logs" DROP COLUMN "hospitalCode",
ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "role_names" DROP COLUMN "createdByHospitalCode",
ADD COLUMN     "createdByTenantId" TEXT;

-- AlterTable
ALTER TABLE "shift_masters" DROP COLUMN "hospitalCode",
ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "staff_profiles" DROP COLUMN "hospitalCode",
ADD COLUMN     "tenantId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "assigned_packages_tenantId_idx" ON "assigned_packages"("tenantId");

-- CreateIndex
CREATE INDEX "audit_logs_tenantId_idx" ON "audit_logs"("tenantId");

-- CreateIndex
CREATE INDEX "departments_tenantId_idx" ON "departments"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "departments_tenantId_name_key" ON "departments"("tenantId", "name");

-- CreateIndex
CREATE INDEX "doctor_availabilities_tenantId_doctorProfileId_idx" ON "doctor_availabilities"("tenantId", "doctorProfileId");

-- CreateIndex
CREATE INDEX "doctor_leave_blocks_tenantId_doctorProfileId_blockDate_idx" ON "doctor_leave_blocks"("tenantId", "doctorProfileId", "blockDate");

-- CreateIndex
CREATE INDEX "doctor_profiles_tenantId_idx" ON "doctor_profiles"("tenantId");

-- CreateIndex
CREATE INDEX "hospital_roles_tenantId_idx" ON "hospital_roles"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "hospital_roles_tenantId_roleNameId_key" ON "hospital_roles"("tenantId", "roleNameId");

-- CreateIndex
CREATE INDEX "hospital_users_tenantId_idx" ON "hospital_users"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "hospital_users_tenantId_username_key" ON "hospital_users"("tenantId", "username");

-- CreateIndex
CREATE UNIQUE INDEX "hospital_users_tenantId_email_key" ON "hospital_users"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "hospitals_tenantId_key" ON "hospitals"("tenantId");

-- CreateIndex
CREATE INDEX "permission_copy_logs_tenantId_idx" ON "permission_copy_logs"("tenantId");

-- CreateIndex
CREATE INDEX "shift_masters_tenantId_idx" ON "shift_masters"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "shift_masters_tenantId_name_key" ON "shift_masters"("tenantId", "name");

-- CreateIndex
CREATE INDEX "staff_profiles_tenantId_idx" ON "staff_profiles"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "staff_profiles_tenantId_employeeId_key" ON "staff_profiles"("tenantId", "employeeId");

-- AddForeignKey
ALTER TABLE "assigned_packages" ADD CONSTRAINT "assigned_packages_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_names" ADD CONSTRAINT "role_names_createdByTenantId_fkey" FOREIGN KEY ("createdByTenantId") REFERENCES "hospitals"("tenantId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital_roles" ADD CONSTRAINT "hospital_roles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_masters" ADD CONSTRAINT "shift_masters_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital_users" ADD CONSTRAINT "hospital_users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_copy_logs" ADD CONSTRAINT "permission_copy_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_profiles" ADD CONSTRAINT "doctor_profiles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_availabilities" ADD CONSTRAINT "doctor_availabilities_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_leave_blocks" ADD CONSTRAINT "doctor_leave_blocks_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
