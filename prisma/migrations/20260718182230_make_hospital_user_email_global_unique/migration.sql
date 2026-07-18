/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `hospital_users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "hospital_users_hospitalId_email_key";

-- CreateIndex
CREATE UNIQUE INDEX "hospital_users_email_key" ON "hospital_users"("email");
