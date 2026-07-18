/*
  Warnings:

  - You are about to drop the `permissions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `role_permissions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `roles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_roles` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "HospitalUserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "HospitalUserType" AS ENUM ('SUPER_ADMIN', 'REGULAR_USER');

-- CreateEnum
CREATE TYPE "LoginType" AS ENUM ('PASSWORD', 'OTP', 'BOTH');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- DropForeignKey
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_permissionId_fkey";

-- DropForeignKey
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_roleId_fkey";

-- DropForeignKey
ALTER TABLE "user_roles" DROP CONSTRAINT "user_roles_roleId_fkey";

-- DropForeignKey
ALTER TABLE "user_roles" DROP CONSTRAINT "user_roles_userId_fkey";

-- AlterTable
ALTER TABLE "hospitals" ADD COLUMN     "activatedAt" TIMESTAMP(3);

-- DropTable
DROP TABLE "permissions";

-- DropTable
DROP TABLE "role_permissions";

-- DropTable
DROP TABLE "roles";

-- DropTable
DROP TABLE "user_roles";

-- CreateTable
CREATE TABLE "role_names" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdByHospitalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_names_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospital_roles" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "roleNameId" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hospital_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospital_role_permissions" (
    "id" TEXT NOT NULL,
    "hospitalRoleId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hospital_role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_masters" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_masters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospital_users" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "userType" "HospitalUserType" NOT NULL DEFAULT 'REGULAR_USER',
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "email" TEXT NOT NULL,
    "mobile" TEXT,
    "alternateMobile" TEXT,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "loginType" "LoginType" NOT NULL DEFAULT 'PASSWORD',
    "status" "HospitalUserStatus" NOT NULL DEFAULT 'ACTIVE',
    "isTemporaryPassword" BOOLEAN NOT NULL DEFAULT true,
    "forcePasswordChange" BOOLEAN NOT NULL DEFAULT true,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "sendCredentialsViaSms" BOOLEAN NOT NULL DEFAULT false,
    "sendCredentialsViaEmail" BOOLEAN NOT NULL DEFAULT false,
    "accountValidTill" TIMESTAMP(3),
    "refreshTokenHash" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hospital_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "title" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" "Gender",
    "bloodGroup" TEXT,
    "designation" TEXT,
    "dateOfJoining" TIMESTAMP(3),
    "shiftId" TEXT,
    "reportingManagerId" TEXT,
    "aadhaarNumber" TEXT,
    "panNumber" TEXT,
    "medicalRegNo" TEXT,
    "qualification" TEXT,
    "specialization" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "emergencyContact" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_role_assignments" (
    "userId" TEXT NOT NULL,
    "hospitalRoleId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_role_assignments_pkey" PRIMARY KEY ("userId","hospitalRoleId")
);

-- CreateTable
CREATE TABLE "user_department_mappings" (
    "userId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,

    CONSTRAINT "user_department_mappings_pkey" PRIMARY KEY ("userId","departmentId")
);

-- CreateTable
CREATE TABLE "user_module_feature_permissions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_module_feature_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission_copy_logs" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "performedByUserId" TEXT NOT NULL,
    "sourceUserId" TEXT NOT NULL,
    "targetUserIds" TEXT[],
    "targetDepartmentIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permission_copy_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "role_names_code_key" ON "role_names"("code");

-- CreateIndex
CREATE INDEX "hospital_roles_hospitalId_idx" ON "hospital_roles"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "hospital_roles_hospitalId_roleNameId_key" ON "hospital_roles"("hospitalId", "roleNameId");

-- CreateIndex
CREATE UNIQUE INDEX "hospital_role_permissions_hospitalRoleId_moduleId_featureId_key" ON "hospital_role_permissions"("hospitalRoleId", "moduleId", "featureId");

-- CreateIndex
CREATE INDEX "departments_hospitalId_idx" ON "departments"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "departments_hospitalId_name_key" ON "departments"("hospitalId", "name");

-- CreateIndex
CREATE INDEX "shift_masters_hospitalId_idx" ON "shift_masters"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "shift_masters_hospitalId_name_key" ON "shift_masters"("hospitalId", "name");

-- CreateIndex
CREATE INDEX "hospital_users_hospitalId_idx" ON "hospital_users"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "hospital_users_hospitalId_email_key" ON "hospital_users"("hospitalId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "hospital_users_hospitalId_username_key" ON "hospital_users"("hospitalId", "username");

-- CreateIndex
CREATE UNIQUE INDEX "staff_profiles_userId_key" ON "staff_profiles"("userId");

-- CreateIndex
CREATE INDEX "staff_profiles_hospitalId_idx" ON "staff_profiles"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "staff_profiles_hospitalId_employeeId_key" ON "staff_profiles"("hospitalId", "employeeId");

-- CreateIndex
CREATE INDEX "user_role_assignments_hospitalRoleId_idx" ON "user_role_assignments"("hospitalRoleId");

-- CreateIndex
CREATE INDEX "user_department_mappings_departmentId_idx" ON "user_department_mappings"("departmentId");

-- CreateIndex
CREATE INDEX "user_module_feature_permissions_userId_idx" ON "user_module_feature_permissions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_module_feature_permissions_userId_moduleId_featureId_key" ON "user_module_feature_permissions"("userId", "moduleId", "featureId");

-- CreateIndex
CREATE INDEX "permission_copy_logs_hospitalId_idx" ON "permission_copy_logs"("hospitalId");

-- AddForeignKey
ALTER TABLE "role_names" ADD CONSTRAINT "role_names_createdByHospitalId_fkey" FOREIGN KEY ("createdByHospitalId") REFERENCES "hospitals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital_roles" ADD CONSTRAINT "hospital_roles_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital_roles" ADD CONSTRAINT "hospital_roles_roleNameId_fkey" FOREIGN KEY ("roleNameId") REFERENCES "role_names"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital_role_permissions" ADD CONSTRAINT "hospital_role_permissions_hospitalRoleId_fkey" FOREIGN KEY ("hospitalRoleId") REFERENCES "hospital_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital_role_permissions" ADD CONSTRAINT "hospital_role_permissions_moduleId_featureId_fkey" FOREIGN KEY ("moduleId", "featureId") REFERENCES "module_features"("moduleId", "featureId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_masters" ADD CONSTRAINT "shift_masters_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital_users" ADD CONSTRAINT "hospital_users_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "hospital_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shift_masters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_reportingManagerId_fkey" FOREIGN KEY ("reportingManagerId") REFERENCES "hospital_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "hospital_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_hospitalRoleId_fkey" FOREIGN KEY ("hospitalRoleId") REFERENCES "hospital_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_department_mappings" ADD CONSTRAINT "user_department_mappings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "hospital_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_department_mappings" ADD CONSTRAINT "user_department_mappings_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_module_feature_permissions" ADD CONSTRAINT "user_module_feature_permissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "hospital_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_module_feature_permissions" ADD CONSTRAINT "user_module_feature_permissions_moduleId_featureId_fkey" FOREIGN KEY ("moduleId", "featureId") REFERENCES "module_features"("moduleId", "featureId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_copy_logs" ADD CONSTRAINT "permission_copy_logs_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_copy_logs" ADD CONSTRAINT "permission_copy_logs_performedByUserId_fkey" FOREIGN KEY ("performedByUserId") REFERENCES "hospital_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_copy_logs" ADD CONSTRAINT "permission_copy_logs_sourceUserId_fkey" FOREIGN KEY ("sourceUserId") REFERENCES "hospital_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
