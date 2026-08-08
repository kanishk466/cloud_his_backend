/*
  Warnings:

  - You are about to drop the column `hospitalId` on the `assigned_packages` table. All the data in the column will be lost.
  - You are about to drop the column `hospitalId` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `hospitalId` on the `departments` table. All the data in the column will be lost.
  - You are about to drop the column `hospitalId` on the `doctor_availabilities` table. All the data in the column will be lost.
  - You are about to drop the column `hospitalId` on the `doctor_leave_blocks` table. All the data in the column will be lost.
  - You are about to drop the column `hospitalId` on the `doctor_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `hospitalId` on the `hospital_roles` table. All the data in the column will be lost.
  - The primary key for the `hospitals` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `hospitalId` on the `permission_copy_logs` table. All the data in the column will be lost.
  - You are about to drop the column `createdByHospitalId` on the `role_names` table. All the data in the column will be lost.
  - You are about to drop the column `hospitalId` on the `shift_masters` table. All the data in the column will be lost.
  - You are about to drop the column `hospitalId` on the `staff_profiles` table. All the data in the column will be lost.
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
-- CreateEnum
CREATE TYPE "PatientType" AS ENUM ('NEW', 'REVIEW', 'REFERRAL', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "PatientStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DECEASED');

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED');

-- CreateEnum
CREATE TYPE "BloodGroup" AS ENUM ('A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "RelationType" AS ENUM ('SELF', 'SPOUSE', 'FATHER', 'MOTHER', 'SON', 'DAUGHTER', 'BROTHER', 'SISTER', 'GUARDIAN', 'OTHER');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('BOOKED', 'CHECKED_IN', 'IN_QUEUE', 'IN_CONSULTATION', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('WALK_IN', 'SCHEDULED', 'EMERGENCY', 'TELECONSULTATION');

-- CreateEnum
CREATE TYPE "VisitType" AS ENUM ('NEW_VISIT', 'FOLLOW_UP', 'REVIEW', 'REFERRAL', 'POST_OP', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "TokenStatus" AS ENUM ('WAITING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ConsultationStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'REFERRED');

-- CreateEnum
CREATE TYPE "PrescriptionFrequency" AS ENUM ('ONCE_DAILY', 'TWICE_DAILY', 'THRICE_DAILY', 'FOUR_TIMES_DAILY', 'EVERY_6_HOURS', 'EVERY_8_HOURS', 'EVERY_12_HOURS', 'AS_NEEDED', 'BEFORE_MEALS', 'AFTER_MEALS', 'AT_BEDTIME', 'STAT', 'WEEKLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "MealRelation" AS ENUM ('BEFORE_FOOD', 'AFTER_FOOD', 'WITH_FOOD', 'EMPTY_STOMACH', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "MedicineRoute" AS ENUM ('ORAL', 'IV', 'IM', 'SC', 'TOPICAL', 'SUBLINGUAL', 'INHALATION', 'RECTAL', 'NASAL', 'OPHTHALMIC', 'OTIC', 'OTHER');

-- CreateEnum
CREATE TYPE "InvestigationType" AS ENUM ('LAB', 'RADIOLOGY', 'PATHOLOGY', 'CARDIOLOGY', 'OTHER');

-- CreateEnum
CREATE TYPE "InvestigationUrgency" AS ENUM ('ROUTINE', 'URGENT', 'STAT');

-- CreateEnum
CREATE TYPE "InvestigationStatus" AS ENUM ('ORDERED', 'SAMPLE_COLLECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'PARTIALLY_PAID', 'REFUNDED', 'WAIVED');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('CASH', 'CARD', 'UPI', 'INSURANCE', 'ONLINE', 'MIXED');

-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('DRAFT', 'GENERATED', 'PAID', 'PARTIALLY_PAID', 'CANCELLED', 'REFUNDED');

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
ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "audit_logs" DROP COLUMN "hospitalId",
ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "departments" DROP COLUMN "hospitalId",
ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "doctor_availabilities" DROP COLUMN "hospitalId",
ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "doctor_leave_blocks" DROP COLUMN "hospitalId",
ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "doctor_profiles" DROP COLUMN "hospitalId",
ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "hospital_roles" DROP COLUMN "hospitalId",
ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "hospital_users" ADD COLUMN     "tenantId" TEXT NOT NULL,
ALTER COLUMN "hospitalId" DROP NOT NULL,
ALTER COLUMN "hospitalId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "hospitals" DROP CONSTRAINT "hospitals_pkey",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "pincode" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "tenantId" TEXT NOT NULL,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "hospitals_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "hospitals_id_seq";

-- AlterTable
ALTER TABLE "permission_copy_logs" DROP COLUMN "hospitalId",
ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "role_names" DROP COLUMN "createdByHospitalId",
ADD COLUMN     "createdByTenantId" TEXT;

-- AlterTable
ALTER TABLE "shift_masters" DROP COLUMN "hospitalId",
ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "staff_profiles" DROP COLUMN "hospitalId",
ADD COLUMN     "tenantId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "hospital_user_hospitals" (
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "hospital_user_hospitals_pkey" PRIMARY KEY ("userId","tenantId")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "uhid" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "dateOfBirth" DATE,
    "age" INTEGER,
    "ageUnit" TEXT DEFAULT 'years',
    "gender" "Gender" NOT NULL,
    "bloodGroup" "BloodGroup",
    "maritalStatus" "MaritalStatus",
    "photo" TEXT,
    "mobile" TEXT NOT NULL,
    "alternateMobile" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "district" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "country" TEXT DEFAULT 'India',
    "aadhaarNumber" TEXT,
    "panNumber" TEXT,
    "abhaId" TEXT,
    "guardianName" TEXT,
    "guardianRelation" "RelationType",
    "guardianMobile" TEXT,
    "insuranceProvider" TEXT,
    "insurancePolicyNo" TEXT,
    "insuranceValidTill" TIMESTAMP(3),
    "allergies" TEXT,
    "chronicDiseases" TEXT,
    "patientType" "PatientType" NOT NULL DEFAULT 'NEW',
    "status" "PatientStatus" NOT NULL DEFAULT 'ACTIVE',
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registeredBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "patients_tenantId_idx" ON "patients"("tenantId");

-- CreateIndex
CREATE INDEX "patients_tenantId_mobile_idx" ON "patients"("tenantId", "mobile");

-- CreateIndex
CREATE INDEX "patients_tenantId_abhaId_idx" ON "patients"("tenantId", "abhaId");

-- CreateIndex
CREATE INDEX "patients_tenantId_status_idx" ON "patients"("tenantId", "status");

-- CreateIndex
CREATE INDEX "patients_tenantId_deletedAt_idx" ON "patients"("tenantId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "patients_tenantId_uhid_key" ON "patients"("tenantId", "uhid");

-- CreateIndex
CREATE UNIQUE INDEX "patients_tenantId_mobile_key" ON "patients"("tenantId", "mobile");

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
ALTER TABLE "hospital_users" ADD CONSTRAINT "hospital_users_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital_user_hospitals" ADD CONSTRAINT "hospital_user_hospitals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "hospital_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital_user_hospitals" ADD CONSTRAINT "hospital_user_hospitals_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_copy_logs" ADD CONSTRAINT "permission_copy_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_profiles" ADD CONSTRAINT "doctor_profiles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_availabilities" ADD CONSTRAINT "doctor_availabilities_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_leave_blocks" ADD CONSTRAINT "doctor_leave_blocks_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;
