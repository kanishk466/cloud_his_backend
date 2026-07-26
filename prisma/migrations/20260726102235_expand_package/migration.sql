/*
  Warnings:

  - Added the required column `maxBranches` to the `packages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `maxDoctors` to the `packages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `maxStorageGb` to the `packages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `monthlyPrice` to the `packages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `yearlyPrice` to the `packages` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "packages" ADD COLUMN     "isPopular" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxBranches" INTEGER NOT NULL,
ADD COLUMN     "maxDoctors" INTEGER NOT NULL,
ADD COLUMN     "maxStorageGb" INTEGER NOT NULL,
ADD COLUMN     "monthlyPrice" INTEGER NOT NULL,
ADD COLUMN     "yearlyPrice" INTEGER NOT NULL;
