/*
  Warnings:

  - You are about to drop the column `hospitalId` on the `assigned_packages` table. All the data in the column will be lost.
  - You are about to drop the column `hospitalId` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `hospitalId` on the `departments` table. All the data in the column will be lost.
  - You are about to drop the column `hospitalId` on the `doctor_availabilities` table. All the data in the column will be lost.
  - You are about to drop the column `hospitalId` on the `doctor_leave_blocks` table. All the data in the column will be lost.
  - You are about to drop the column `hospitalId` on the `doctor_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `hospitalId` on the `hospital_roles` table. All the data in the column will be lost.
  - You are about to drop the column `hospitalId` on the `hospital_users` table. All the data in the column will be lost.
  - You are about to drop the column `hospitalId` on the `permission_copy_logs` table. All the data in the column will be lost.
  - You are about to drop the column `createdByHospitalId` on the `role_names` table. All the data in the column will be lost.
  - You are about to drop the column `hospitalId` on the `shift_masters` table. All the data in the column will be lost.
  - You are about to drop the column `hospitalId` on the `staff_profiles` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[hospitalCode,name]` on the table `departments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[hospitalCode,roleNameId]` on the table `hospital_roles` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[hospitalCode,username]` on the table `hospital_users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[hospitalCode,email]` on the table `hospital_users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[hospitalCode,name]` on the table `shift_masters` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[hospitalCode,employeeId]` on the table `staff_profiles` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `hospitalCode` to the `assigned_packages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hospitalCode` to the `departments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hospitalCode` to the `doctor_availabilities` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hospitalCode` to the `doctor_leave_blocks` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hospitalCode` to the `doctor_profiles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hospitalCode` to the `hospital_roles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hospitalCode` to the `hospital_users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hospitalCode` to the `permission_copy_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hospitalCode` to the `shift_masters` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hospitalCode` to the `staff_profiles` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "assigned_packages" DROP CONSTRAINT "assigned_packages_hospitalId_fkey";

-- DropForeignKey
ALTER TABLE "departments" DROP CONSTRAINT "departments_hospitalId_fkey";

-- DropForeignKey
ALTER TABLE "doctor_availabilities" DROP CONSTRAINT "doctor_availabilities_hospitalId_fkey";

-- DropForeignKey
ALTER TABLE "doctor_leave_blocks" DROP CONSTRAINT "doctor_leave_blocks_hospitalId_fkey";

-- DropForeignKey
ALTER TABLE "doctor_profiles" DROP CONSTRAINT "doctor_profiles_hospitalId_fkey";

-- DropForeignKey
ALTER TABLE "hospital_roles" DROP CONSTRAINT "hospital_roles_hospitalId_fkey";

-- DropForeignKey
ALTER TABLE "hospital_users" DROP CONSTRAINT "hospital_users_hospitalId_fkey";

-- DropForeignKey
ALTER TABLE "permission_copy_logs" DROP CONSTRAINT "permission_copy_logs_hospitalId_fkey";

-- DropForeignKey
ALTER TABLE "role_names" DROP CONSTRAINT "role_names_createdByHospitalId_fkey";

-- DropForeignKey
ALTER TABLE "shift_masters" DROP CONSTRAINT "shift_masters_hospitalId_fkey";

-- DropIndex
DROP INDEX "audit_logs_hospitalId_idx";

-- DropIndex
DROP INDEX "departments_hospitalId_idx";

-- DropIndex
DROP INDEX "departments_hospitalId_name_key";

-- DropIndex
DROP INDEX "doctor_availabilities_hospitalId_doctorProfileId_idx";

-- DropIndex
DROP INDEX "doctor_leave_blocks_hospitalId_doctorProfileId_blockDate_idx";

-- DropIndex
DROP INDEX "doctor_profiles_hospitalId_idx";

-- DropIndex
DROP INDEX "hospital_roles_hospitalId_idx";

-- DropIndex
DROP INDEX "hospital_roles_hospitalId_roleNameId_key";

-- DropIndex
DROP INDEX "hospital_users_hospitalId_email_key";

-- DropIndex
DROP INDEX "hospital_users_hospitalId_idx";

-- DropIndex
DROP INDEX "hospital_users_hospitalId_username_key";

-- DropIndex
DROP INDEX "permission_copy_logs_hospitalId_idx";

-- DropIndex
DROP INDEX "shift_masters_hospitalId_idx";

-- DropIndex
DROP INDEX "shift_masters_hospitalId_name_key";

-- DropIndex
DROP INDEX "staff_profiles_hospitalId_employeeId_key";

-- DropIndex
DROP INDEX "staff_profiles_hospitalId_idx";

-- AlterTable
ALTER TABLE "assigned_packages" DROP COLUMN "hospitalId",
ADD COLUMN     "hospitalCode" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "audit_logs" DROP COLUMN "hospitalId",
ADD COLUMN     "hospitalCode" TEXT;

-- AlterTable
ALTER TABLE "departments" DROP COLUMN "hospitalId",
ADD COLUMN     "hospitalCode" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "doctor_availabilities" DROP COLUMN "hospitalId",
ADD COLUMN     "hospitalCode" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "doctor_leave_blocks" DROP COLUMN "hospitalId",
ADD COLUMN     "hospitalCode" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "doctor_profiles" DROP COLUMN "hospitalId",
ADD COLUMN     "hospitalCode" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "hospital_roles" DROP COLUMN "hospitalId",
ADD COLUMN     "hospitalCode" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "hospital_users" DROP COLUMN "hospitalId",
ADD COLUMN     "hospitalCode" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "permission_copy_logs" DROP COLUMN "hospitalId",
ADD COLUMN     "hospitalCode" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "role_names" DROP COLUMN "createdByHospitalId",
ADD COLUMN     "createdByHospitalCode" TEXT;

-- AlterTable
ALTER TABLE "shift_masters" DROP COLUMN "hospitalId",
ADD COLUMN     "hospitalCode" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "staff_profiles" DROP COLUMN "hospitalId",
ADD COLUMN     "hospitalCode" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "assigned_packages_hospitalCode_idx" ON "assigned_packages"("hospitalCode");

-- CreateIndex
CREATE INDEX "audit_logs_hospitalCode_idx" ON "audit_logs"("hospitalCode");

-- CreateIndex
CREATE INDEX "departments_hospitalCode_idx" ON "departments"("hospitalCode");

-- CreateIndex
CREATE UNIQUE INDEX "departments_hospitalCode_name_key" ON "departments"("hospitalCode", "name");

-- CreateIndex
CREATE INDEX "doctor_availabilities_hospitalCode_doctorProfileId_idx" ON "doctor_availabilities"("hospitalCode", "doctorProfileId");

-- CreateIndex
CREATE INDEX "doctor_leave_blocks_hospitalCode_doctorProfileId_blockDate_idx" ON "doctor_leave_blocks"("hospitalCode", "doctorProfileId", "blockDate");

-- CreateIndex
CREATE INDEX "doctor_profiles_hospitalCode_idx" ON "doctor_profiles"("hospitalCode");

-- CreateIndex
CREATE INDEX "hospital_roles_hospitalCode_idx" ON "hospital_roles"("hospitalCode");

-- CreateIndex
CREATE UNIQUE INDEX "hospital_roles_hospitalCode_roleNameId_key" ON "hospital_roles"("hospitalCode", "roleNameId");

-- CreateIndex
CREATE INDEX "hospital_users_hospitalCode_idx" ON "hospital_users"("hospitalCode");

-- CreateIndex
CREATE UNIQUE INDEX "hospital_users_hospitalCode_username_key" ON "hospital_users"("hospitalCode", "username");

-- CreateIndex
CREATE UNIQUE INDEX "hospital_users_hospitalCode_email_key" ON "hospital_users"("hospitalCode", "email");

-- CreateIndex
CREATE INDEX "permission_copy_logs_hospitalCode_idx" ON "permission_copy_logs"("hospitalCode");

-- CreateIndex
CREATE INDEX "shift_masters_hospitalCode_idx" ON "shift_masters"("hospitalCode");

-- CreateIndex
CREATE UNIQUE INDEX "shift_masters_hospitalCode_name_key" ON "shift_masters"("hospitalCode", "name");

-- CreateIndex
CREATE INDEX "staff_profiles_hospitalCode_idx" ON "staff_profiles"("hospitalCode");

-- CreateIndex
CREATE UNIQUE INDEX "staff_profiles_hospitalCode_employeeId_key" ON "staff_profiles"("hospitalCode", "employeeId");

-- AddForeignKey
ALTER TABLE "assigned_packages" ADD CONSTRAINT "assigned_packages_hospitalCode_fkey" FOREIGN KEY ("hospitalCode") REFERENCES "hospitals"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_names" ADD CONSTRAINT "role_names_createdByHospitalCode_fkey" FOREIGN KEY ("createdByHospitalCode") REFERENCES "hospitals"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital_roles" ADD CONSTRAINT "hospital_roles_hospitalCode_fkey" FOREIGN KEY ("hospitalCode") REFERENCES "hospitals"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_hospitalCode_fkey" FOREIGN KEY ("hospitalCode") REFERENCES "hospitals"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_masters" ADD CONSTRAINT "shift_masters_hospitalCode_fkey" FOREIGN KEY ("hospitalCode") REFERENCES "hospitals"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital_users" ADD CONSTRAINT "hospital_users_hospitalCode_fkey" FOREIGN KEY ("hospitalCode") REFERENCES "hospitals"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_copy_logs" ADD CONSTRAINT "permission_copy_logs_hospitalCode_fkey" FOREIGN KEY ("hospitalCode") REFERENCES "hospitals"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_profiles" ADD CONSTRAINT "doctor_profiles_hospitalCode_fkey" FOREIGN KEY ("hospitalCode") REFERENCES "hospitals"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_availabilities" ADD CONSTRAINT "doctor_availabilities_hospitalCode_fkey" FOREIGN KEY ("hospitalCode") REFERENCES "hospitals"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_leave_blocks" ADD CONSTRAINT "doctor_leave_blocks_hospitalCode_fkey" FOREIGN KEY ("hospitalCode") REFERENCES "hospitals"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
