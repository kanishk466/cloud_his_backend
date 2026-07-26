/*
  Warnings:

  - The primary key for the `assigned_packages` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `assigned_packages` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `departments` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `departments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `features` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `features` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `hospital_role_permissions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `hospital_role_permissions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `hospital_roles` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `hospital_roles` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `hospitals` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `hospitals` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `module_features` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `modules` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `modules` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `parentId` column on the `modules` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `package_modules` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `packages` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `packages` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `permission_copy_logs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `permission_copy_logs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `targetDepartmentIds` column on the `permission_copy_logs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `role_names` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `role_names` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `createdByHospitalId` column on the `role_names` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `shift_masters` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `shift_masters` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `staff_profiles` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `staff_profiles` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `shiftId` column on the `staff_profiles` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `user_department_mappings` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `user_module_feature_permissions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `user_module_feature_permissions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `user_role_assignments` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `hospitalId` on the `assigned_packages` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `packageId` on the `assigned_packages` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `hospitalId` on the `departments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `hospitalRoleId` on the `hospital_role_permissions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `moduleId` on the `hospital_role_permissions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `featureId` on the `hospital_role_permissions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `hospitalId` on the `hospital_roles` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `roleNameId` on the `hospital_roles` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `hospitalId` on the `hospital_users` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `moduleId` on the `module_features` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `featureId` on the `module_features` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `packageId` on the `package_modules` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `moduleId` on the `package_modules` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `hospitalId` on the `permission_copy_logs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `hospitalId` on the `shift_masters` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `hospitalId` on the `staff_profiles` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `departmentId` on the `user_department_mappings` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `moduleId` on the `user_module_feature_permissions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `featureId` on the `user_module_feature_permissions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `hospitalRoleId` on the `user_role_assignments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "assigned_packages" DROP CONSTRAINT "assigned_packages_hospitalId_fkey";

-- DropForeignKey
ALTER TABLE "assigned_packages" DROP CONSTRAINT "assigned_packages_packageId_fkey";

-- DropForeignKey
ALTER TABLE "departments" DROP CONSTRAINT "departments_hospitalId_fkey";

-- DropForeignKey
ALTER TABLE "hospital_role_permissions" DROP CONSTRAINT "hospital_role_permissions_hospitalRoleId_fkey";

-- DropForeignKey
ALTER TABLE "hospital_role_permissions" DROP CONSTRAINT "hospital_role_permissions_moduleId_featureId_fkey";

-- DropForeignKey
ALTER TABLE "hospital_roles" DROP CONSTRAINT "hospital_roles_hospitalId_fkey";

-- DropForeignKey
ALTER TABLE "hospital_roles" DROP CONSTRAINT "hospital_roles_roleNameId_fkey";

-- DropForeignKey
ALTER TABLE "hospital_users" DROP CONSTRAINT "hospital_users_hospitalId_fkey";

-- DropForeignKey
ALTER TABLE "module_features" DROP CONSTRAINT "module_features_featureId_fkey";

-- DropForeignKey
ALTER TABLE "module_features" DROP CONSTRAINT "module_features_moduleId_fkey";

-- DropForeignKey
ALTER TABLE "modules" DROP CONSTRAINT "modules_parentId_fkey";

-- DropForeignKey
ALTER TABLE "package_modules" DROP CONSTRAINT "package_modules_moduleId_fkey";

-- DropForeignKey
ALTER TABLE "package_modules" DROP CONSTRAINT "package_modules_packageId_fkey";

-- DropForeignKey
ALTER TABLE "permission_copy_logs" DROP CONSTRAINT "permission_copy_logs_hospitalId_fkey";

-- DropForeignKey
ALTER TABLE "role_names" DROP CONSTRAINT "role_names_createdByHospitalId_fkey";

-- DropForeignKey
ALTER TABLE "shift_masters" DROP CONSTRAINT "shift_masters_hospitalId_fkey";

-- DropForeignKey
ALTER TABLE "staff_profiles" DROP CONSTRAINT "staff_profiles_shiftId_fkey";

-- DropForeignKey
ALTER TABLE "user_department_mappings" DROP CONSTRAINT "user_department_mappings_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "user_module_feature_permissions" DROP CONSTRAINT "user_module_feature_permissions_moduleId_featureId_fkey";

-- DropForeignKey
ALTER TABLE "user_role_assignments" DROP CONSTRAINT "user_role_assignments_hospitalRoleId_fkey";

-- AlterTable
ALTER TABLE "assigned_packages" DROP CONSTRAINT "assigned_packages_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "hospitalId",
ADD COLUMN     "hospitalId" INTEGER NOT NULL,
DROP COLUMN "packageId",
ADD COLUMN     "packageId" INTEGER NOT NULL,
ADD CONSTRAINT "assigned_packages_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "departments" DROP CONSTRAINT "departments_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "hospitalId",
ADD COLUMN     "hospitalId" INTEGER NOT NULL,
ADD CONSTRAINT "departments_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "features" DROP CONSTRAINT "features_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "features_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "hospital_role_permissions" DROP CONSTRAINT "hospital_role_permissions_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "hospitalRoleId",
ADD COLUMN     "hospitalRoleId" INTEGER NOT NULL,
DROP COLUMN "moduleId",
ADD COLUMN     "moduleId" INTEGER NOT NULL,
DROP COLUMN "featureId",
ADD COLUMN     "featureId" INTEGER NOT NULL,
ADD CONSTRAINT "hospital_role_permissions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "hospital_roles" DROP CONSTRAINT "hospital_roles_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "hospitalId",
ADD COLUMN     "hospitalId" INTEGER NOT NULL,
DROP COLUMN "roleNameId",
ADD COLUMN     "roleNameId" INTEGER NOT NULL,
ADD CONSTRAINT "hospital_roles_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "hospital_users" DROP COLUMN "hospitalId",
ADD COLUMN     "hospitalId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "hospitals" DROP CONSTRAINT "hospitals_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "hospitals_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "module_features" DROP CONSTRAINT "module_features_pkey",
DROP COLUMN "moduleId",
ADD COLUMN     "moduleId" INTEGER NOT NULL,
DROP COLUMN "featureId",
ADD COLUMN     "featureId" INTEGER NOT NULL,
ADD CONSTRAINT "module_features_pkey" PRIMARY KEY ("moduleId", "featureId");

-- AlterTable
ALTER TABLE "modules" DROP CONSTRAINT "modules_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "parentId",
ADD COLUMN     "parentId" INTEGER,
ADD CONSTRAINT "modules_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "package_modules" DROP CONSTRAINT "package_modules_pkey",
DROP COLUMN "packageId",
ADD COLUMN     "packageId" INTEGER NOT NULL,
DROP COLUMN "moduleId",
ADD COLUMN     "moduleId" INTEGER NOT NULL,
ADD CONSTRAINT "package_modules_pkey" PRIMARY KEY ("packageId", "moduleId");

-- AlterTable
ALTER TABLE "packages" DROP CONSTRAINT "packages_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "packages_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "permission_copy_logs" DROP CONSTRAINT "permission_copy_logs_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "hospitalId",
ADD COLUMN     "hospitalId" INTEGER NOT NULL,
DROP COLUMN "targetDepartmentIds",
ADD COLUMN     "targetDepartmentIds" INTEGER[],
ADD CONSTRAINT "permission_copy_logs_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "role_names" DROP CONSTRAINT "role_names_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "createdByHospitalId",
ADD COLUMN     "createdByHospitalId" INTEGER,
ADD CONSTRAINT "role_names_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "shift_masters" DROP CONSTRAINT "shift_masters_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "hospitalId",
ADD COLUMN     "hospitalId" INTEGER NOT NULL,
ADD CONSTRAINT "shift_masters_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "staff_profiles" DROP CONSTRAINT "staff_profiles_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "hospitalId",
ADD COLUMN     "hospitalId" INTEGER NOT NULL,
DROP COLUMN "shiftId",
ADD COLUMN     "shiftId" INTEGER,
ADD CONSTRAINT "staff_profiles_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "user_department_mappings" DROP CONSTRAINT "user_department_mappings_pkey",
DROP COLUMN "departmentId",
ADD COLUMN     "departmentId" INTEGER NOT NULL,
ADD CONSTRAINT "user_department_mappings_pkey" PRIMARY KEY ("userId", "departmentId");

-- AlterTable
ALTER TABLE "user_module_feature_permissions" DROP CONSTRAINT "user_module_feature_permissions_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "moduleId",
ADD COLUMN     "moduleId" INTEGER NOT NULL,
DROP COLUMN "featureId",
ADD COLUMN     "featureId" INTEGER NOT NULL,
ADD CONSTRAINT "user_module_feature_permissions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "user_role_assignments" DROP CONSTRAINT "user_role_assignments_pkey",
DROP COLUMN "hospitalRoleId",
ADD COLUMN     "hospitalRoleId" INTEGER NOT NULL,
ADD CONSTRAINT "user_role_assignments_pkey" PRIMARY KEY ("userId", "hospitalRoleId");

-- CreateIndex
CREATE INDEX "departments_hospitalId_idx" ON "departments"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "departments_hospitalId_name_key" ON "departments"("hospitalId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "hospital_role_permissions_hospitalRoleId_moduleId_featureId_key" ON "hospital_role_permissions"("hospitalRoleId", "moduleId", "featureId");

-- CreateIndex
CREATE INDEX "hospital_roles_hospitalId_idx" ON "hospital_roles"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "hospital_roles_hospitalId_roleNameId_key" ON "hospital_roles"("hospitalId", "roleNameId");

-- CreateIndex
CREATE INDEX "hospital_users_hospitalId_idx" ON "hospital_users"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "hospital_users_hospitalId_username_key" ON "hospital_users"("hospitalId", "username");

-- CreateIndex
CREATE INDEX "permission_copy_logs_hospitalId_idx" ON "permission_copy_logs"("hospitalId");

-- CreateIndex
CREATE INDEX "shift_masters_hospitalId_idx" ON "shift_masters"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "shift_masters_hospitalId_name_key" ON "shift_masters"("hospitalId", "name");

-- CreateIndex
CREATE INDEX "staff_profiles_hospitalId_idx" ON "staff_profiles"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "staff_profiles_hospitalId_employeeId_key" ON "staff_profiles"("hospitalId", "employeeId");

-- CreateIndex
CREATE INDEX "user_department_mappings_departmentId_idx" ON "user_department_mappings"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "user_module_feature_permissions_userId_moduleId_featureId_key" ON "user_module_feature_permissions"("userId", "moduleId", "featureId");

-- CreateIndex
CREATE INDEX "user_role_assignments_hospitalRoleId_idx" ON "user_role_assignments"("hospitalRoleId");

-- AddForeignKey
ALTER TABLE "modules" ADD CONSTRAINT "modules_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "modules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_features" ADD CONSTRAINT "module_features_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_features" ADD CONSTRAINT "module_features_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "features"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_modules" ADD CONSTRAINT "package_modules_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_modules" ADD CONSTRAINT "package_modules_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assigned_packages" ADD CONSTRAINT "assigned_packages_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assigned_packages" ADD CONSTRAINT "assigned_packages_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shift_masters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_hospitalRoleId_fkey" FOREIGN KEY ("hospitalRoleId") REFERENCES "hospital_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_department_mappings" ADD CONSTRAINT "user_department_mappings_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_module_feature_permissions" ADD CONSTRAINT "user_module_feature_permissions_moduleId_featureId_fkey" FOREIGN KEY ("moduleId", "featureId") REFERENCES "module_features"("moduleId", "featureId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_copy_logs" ADD CONSTRAINT "permission_copy_logs_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
