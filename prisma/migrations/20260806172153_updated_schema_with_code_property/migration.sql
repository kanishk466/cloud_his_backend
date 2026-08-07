/*
  Warnings:

  - Added the required column `code` to the `hospital_users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "hospital_users" ADD COLUMN     "code" TEXT NOT NULL;
