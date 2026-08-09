/*
  Warnings:

  - You are about to drop the column `code` on the `hospital_users` table. All the data in the column will be lost.
  - The primary key for the `hospitals` table will be changed. If it partially fails, the table could be left without primary key constraint.

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

-- AlterTable
ALTER TABLE "hospital_users" DROP COLUMN "code";

-- AlterTable
ALTER TABLE "hospitals" DROP CONSTRAINT "hospitals_pkey",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "pincode" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "hospitals_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "hospitals_id_seq";

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

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "appointmentNo" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorProfileId" TEXT NOT NULL,
    "departmentId" INTEGER,
    "appointmentDate" DATE NOT NULL,
    "slotStartTime" TEXT,
    "slotEndTime" TEXT,
    "appointmentType" "AppointmentType" NOT NULL DEFAULT 'WALK_IN',
    "visitType" "VisitType" NOT NULL DEFAULT 'NEW_VISIT',
    "status" "AppointmentStatus" NOT NULL DEFAULT 'BOOKED',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "consultationFee" DECIMAL(10,2) NOT NULL,
    "referredByDoctorName" TEXT,
    "referralNote" TEXT,
    "reasonForVisit" TEXT,
    "notes" TEXT,
    "bookedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bookedBy" TEXT,
    "checkedInAt" TIMESTAMP(3),
    "checkedInBy" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "cancelledBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opd_tokens" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "doctorProfileId" TEXT NOT NULL,
    "tokenNumber" INTEGER NOT NULL,
    "tokenDate" DATE NOT NULL,
    "status" "TokenStatus" NOT NULL DEFAULT 'WAITING',
    "originalPosition" INTEGER,
    "estimatedTime" TEXT,
    "calledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "roomNo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opd_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_vitals" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "consultationId" TEXT,
    "appointmentId" TEXT,
    "heightCm" DECIMAL(5,2),
    "weightKg" DECIMAL(5,2),
    "bmi" DECIMAL(4,1),
    "temperatureF" DECIMAL(4,1),
    "bloodPressureSys" INTEGER,
    "bloodPressureDia" INTEGER,
    "pulseRate" INTEGER,
    "respiratoryRate" INTEGER,
    "spo2" DECIMAL(4,1),
    "bloodSugarFasting" DECIMAL(5,1),
    "bloodSugarPP" DECIMAL(5,1),
    "bloodSugarRandom" DECIMAL(5,1),
    "painScore" INTEGER,
    "chiefComplaints" TEXT,
    "notes" TEXT,
    "recordedBy" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_vitals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "consultationNo" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorProfileId" TEXT NOT NULL,
    "chiefComplaints" TEXT,
    "historyOfIllness" TEXT,
    "pastHistory" TEXT,
    "familyHistory" TEXT,
    "personalHistory" TEXT,
    "generalExamination" TEXT,
    "systemicExamination" TEXT,
    "localExamination" TEXT,
    "provisionalDiagnosis" TEXT,
    "finalDiagnosis" TEXT,
    "icdCodes" TEXT[],
    "clinicalNotes" TEXT,
    "specialInstructions" TEXT,
    "followUpDate" DATE,
    "followUpNotes" TEXT,
    "referredToDoctorId" TEXT,
    "referredToDepartment" TEXT,
    "referralReason" TEXT,
    "status" "ConsultationStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescriptions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "medicineName" TEXT NOT NULL,
    "genericName" TEXT,
    "medicineType" TEXT,
    "dosage" TEXT,
    "frequency" "PrescriptionFrequency" NOT NULL DEFAULT 'TWICE_DAILY',
    "customFrequency" TEXT,
    "route" "MedicineRoute" NOT NULL DEFAULT 'ORAL',
    "mealRelation" "MealRelation" NOT NULL DEFAULT 'AFTER_FOOD',
    "durationDays" INTEGER,
    "durationWeeks" INTEGER,
    "quantity" INTEGER,
    "instructions" TEXT,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investigation_orders" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "investigationName" TEXT NOT NULL,
    "investigationType" "InvestigationType" NOT NULL DEFAULT 'LAB',
    "urgency" "InvestigationUrgency" NOT NULL DEFAULT 'ROUTINE',
    "instructions" TEXT,
    "clinicalNotes" TEXT,
    "status" "InvestigationStatus" NOT NULL DEFAULT 'ORDERED',
    "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "resultSummary" TEXT,
    "resultFile" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investigation_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opd_bills" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "billNo" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "consultationFee" DECIMAL(10,2) NOT NULL,
    "registrationFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "otherCharges" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "taxPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "dueAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMode" "PaymentMode",
    "billStatus" "BillStatus" NOT NULL DEFAULT 'DRAFT',
    "isInsurance" BOOLEAN NOT NULL DEFAULT false,
    "insuranceProvider" TEXT,
    "insurancePolicyNo" TEXT,
    "insuranceClaimed" DECIMAL(10,2),
    "insuranceApproved" DECIMAL(10,2),
    "discountReason" TEXT,
    "discountAuthorizedBy" TEXT,
    "generatedBy" TEXT,
    "billedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opd_bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opd_payments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "receiptNo" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentMode" "PaymentMode" NOT NULL,
    "transactionId" TEXT,
    "receivedBy" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "opd_payments_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "appointments_tenantId_appointmentDate_idx" ON "appointments"("tenantId", "appointmentDate");

-- CreateIndex
CREATE INDEX "appointments_tenantId_doctorProfileId_appointmentDate_idx" ON "appointments"("tenantId", "doctorProfileId", "appointmentDate");

-- CreateIndex
CREATE INDEX "appointments_tenantId_patientId_idx" ON "appointments"("tenantId", "patientId");

-- CreateIndex
CREATE INDEX "appointments_tenantId_status_idx" ON "appointments"("tenantId", "status");

-- CreateIndex
CREATE INDEX "appointments_tenantId_doctorProfileId_appointmentDate_slotS_idx" ON "appointments"("tenantId", "doctorProfileId", "appointmentDate", "slotStartTime");

-- CreateIndex
CREATE INDEX "appointments_tenantId_deletedAt_idx" ON "appointments"("tenantId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_tenantId_appointmentNo_key" ON "appointments"("tenantId", "appointmentNo");

-- CreateIndex
CREATE UNIQUE INDEX "opd_tokens_appointmentId_key" ON "opd_tokens"("appointmentId");

-- CreateIndex
CREATE INDEX "opd_tokens_tenantId_doctorProfileId_tokenDate_idx" ON "opd_tokens"("tenantId", "doctorProfileId", "tokenDate");

-- CreateIndex
CREATE INDEX "opd_tokens_tenantId_status_idx" ON "opd_tokens"("tenantId", "status");

-- CreateIndex
CREATE INDEX "opd_tokens_tenantId_tokenDate_idx" ON "opd_tokens"("tenantId", "tokenDate");

-- CreateIndex
CREATE UNIQUE INDEX "opd_tokens_tenantId_doctorProfileId_tokenDate_tokenNumber_key" ON "opd_tokens"("tenantId", "doctorProfileId", "tokenDate", "tokenNumber");

-- CreateIndex
CREATE INDEX "patient_vitals_tenantId_patientId_idx" ON "patient_vitals"("tenantId", "patientId");

-- CreateIndex
CREATE INDEX "patient_vitals_tenantId_appointmentId_idx" ON "patient_vitals"("tenantId", "appointmentId");

-- CreateIndex
CREATE INDEX "patient_vitals_tenantId_recordedAt_idx" ON "patient_vitals"("tenantId", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "consultations_appointmentId_key" ON "consultations"("appointmentId");

-- CreateIndex
CREATE INDEX "consultations_tenantId_patientId_idx" ON "consultations"("tenantId", "patientId");

-- CreateIndex
CREATE INDEX "consultations_tenantId_doctorProfileId_idx" ON "consultations"("tenantId", "doctorProfileId");

-- CreateIndex
CREATE INDEX "consultations_tenantId_appointmentId_idx" ON "consultations"("tenantId", "appointmentId");

-- CreateIndex
CREATE INDEX "consultations_tenantId_startedAt_idx" ON "consultations"("tenantId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "consultations_tenantId_consultationNo_key" ON "consultations"("tenantId", "consultationNo");

-- CreateIndex
CREATE INDEX "prescriptions_tenantId_consultationId_idx" ON "prescriptions"("tenantId", "consultationId");

-- CreateIndex
CREATE INDEX "investigation_orders_tenantId_consultationId_idx" ON "investigation_orders"("tenantId", "consultationId");

-- CreateIndex
CREATE INDEX "investigation_orders_tenantId_status_idx" ON "investigation_orders"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "opd_bills_appointmentId_key" ON "opd_bills"("appointmentId");

-- CreateIndex
CREATE INDEX "opd_bills_tenantId_patientId_idx" ON "opd_bills"("tenantId", "patientId");

-- CreateIndex
CREATE INDEX "opd_bills_tenantId_billStatus_idx" ON "opd_bills"("tenantId", "billStatus");

-- CreateIndex
CREATE INDEX "opd_bills_tenantId_billedAt_idx" ON "opd_bills"("tenantId", "billedAt");

-- CreateIndex
CREATE INDEX "opd_bills_tenantId_paymentStatus_idx" ON "opd_bills"("tenantId", "paymentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "opd_bills_tenantId_billNo_key" ON "opd_bills"("tenantId", "billNo");

-- CreateIndex
CREATE INDEX "opd_payments_tenantId_billId_idx" ON "opd_payments"("tenantId", "billId");

-- CreateIndex
CREATE UNIQUE INDEX "opd_payments_tenantId_receiptNo_key" ON "opd_payments"("tenantId", "receiptNo");

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctorProfileId_fkey" FOREIGN KEY ("doctorProfileId") REFERENCES "doctor_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opd_tokens" ADD CONSTRAINT "opd_tokens_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opd_tokens" ADD CONSTRAINT "opd_tokens_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opd_tokens" ADD CONSTRAINT "opd_tokens_doctorProfileId_fkey" FOREIGN KEY ("doctorProfileId") REFERENCES "doctor_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_vitals" ADD CONSTRAINT "patient_vitals_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_vitals" ADD CONSTRAINT "patient_vitals_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_doctorProfileId_fkey" FOREIGN KEY ("doctorProfileId") REFERENCES "doctor_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "consultations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigation_orders" ADD CONSTRAINT "investigation_orders_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigation_orders" ADD CONSTRAINT "investigation_orders_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "consultations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opd_bills" ADD CONSTRAINT "opd_bills_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opd_bills" ADD CONSTRAINT "opd_bills_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opd_bills" ADD CONSTRAINT "opd_bills_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opd_payments" ADD CONSTRAINT "opd_payments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opd_payments" ADD CONSTRAINT "opd_payments_billId_fkey" FOREIGN KEY ("billId") REFERENCES "opd_bills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
