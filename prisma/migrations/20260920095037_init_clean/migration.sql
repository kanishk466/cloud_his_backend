-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('SUPER_ADMIN', 'PLATFORM_ADMIN', 'SUPPORT');

-- CreateEnum
CREATE TYPE "HospitalStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PackageAssignmentStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "HospitalUserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "HospitalUserType" AS ENUM ('SUPER_ADMIN', 'REGULAR_USER', 'DOCTOR');

-- CreateEnum
CREATE TYPE "LoginType" AS ENUM ('PASSWORD', 'OTP', 'BOTH');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

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

-- CreateEnum
CREATE TYPE "MasterCategory" AS ENUM ('PANEL_BILLING', 'CLINICAL', 'INVENTORY', 'GENERAL');

-- CreateEnum
CREATE TYPE "MasterValueType" AS ENUM ('GROUP_TYPE', 'PAYMENT_MODE', 'RATE_TYPE', 'CURRENCY', 'PANEL_TYPE', 'TAX_TYPE', 'DISCOUNT_REASON', 'REFUND_REASON', 'CANCELLATION_REASON', 'CONSULTATION_TYPE', 'DIAGNOSIS_TYPE', 'DIET_TYPE');

-- CreateEnum
CREATE TYPE "CoPaymentOn" AS ENUM ('ON_BILL', 'ON_SERVICE', 'NONE');

-- CreateEnum
CREATE TYPE "ServiceCategory" AS ENUM ('CONSULTATION', 'LAB', 'RADIOLOGY', 'PROCEDURE', 'PHARMACY', 'BED_CHARGE', 'OTHER');

-- CreateTable
CREATE TABLE "platform_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "role" "PlatformRole" NOT NULL DEFAULT 'PLATFORM_ADMIN',
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "password_changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modules" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "route" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "parentId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "features" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_features" (
    "moduleId" INTEGER NOT NULL,
    "featureId" INTEGER NOT NULL,

    CONSTRAINT "module_features_pkey" PRIMARY KEY ("moduleId","featureId")
);

-- CreateTable
CREATE TABLE "packages" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "monthlyPrice" INTEGER NOT NULL,
    "yearlyPrice" INTEGER NOT NULL,
    "maxDoctors" INTEGER NOT NULL,
    "maxStorageGb" INTEGER NOT NULL,
    "maxBranches" INTEGER NOT NULL,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_modules" (
    "packageId" INTEGER NOT NULL,
    "moduleId" INTEGER NOT NULL,

    CONSTRAINT "package_modules_pkey" PRIMARY KEY ("packageId","moduleId")
);

-- CreateTable
CREATE TABLE "hospitals" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "logoUrl" TEXT,
    "status" "HospitalStatus" NOT NULL DEFAULT 'DRAFT',
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hospitals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assigned_packages" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "packageId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" "PackageAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assigned_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_names" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdByTenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_names_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospital_roles" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "roleNameId" INTEGER NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hospital_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospital_role_permissions" (
    "id" SERIAL NOT NULL,
    "hospitalRoleId" INTEGER NOT NULL,
    "moduleId" INTEGER NOT NULL,
    "featureId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hospital_role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_masters" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
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
    "tenantId" TEXT NOT NULL,
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
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "password_changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "title" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" "Gender",
    "bloodGroup" TEXT,
    "designation" TEXT,
    "dateOfJoining" TIMESTAMP(3),
    "shiftId" INTEGER,
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
    "hospitalRoleId" INTEGER NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_role_assignments_pkey" PRIMARY KEY ("userId","hospitalRoleId")
);

-- CreateTable
CREATE TABLE "user_department_mappings" (
    "userId" TEXT NOT NULL,
    "departmentId" INTEGER NOT NULL,

    CONSTRAINT "user_department_mappings_pkey" PRIMARY KEY ("userId","departmentId")
);

-- CreateTable
CREATE TABLE "user_module_feature_permissions" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "moduleId" INTEGER NOT NULL,
    "featureId" INTEGER NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_module_feature_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_profiles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "hospitalUserId" TEXT NOT NULL,
    "specialization" TEXT NOT NULL,
    "qualifications" TEXT,
    "consultationFee" DECIMAL(10,2) NOT NULL,
    "slotDurationMins" INTEGER NOT NULL DEFAULT 15,
    "bufferTimeMins" INTEGER NOT NULL DEFAULT 0,
    "maxPatientsPerDay" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_availabilities" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "doctorProfileId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "breakStartTime" TEXT,
    "breakEndTime" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_availabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_leave_blocks" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "doctorProfileId" TEXT NOT NULL,
    "blockDate" DATE NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doctor_leave_blocks_pkey" PRIMARY KEY ("id")
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
    "companyName" TEXT,
    "empId" TEXT,
    "coverage" TEXT,
    "consultingDoctor" TEXT,
    "department" TEXT,
    "consentToShare" BOOLEAN NOT NULL DEFAULT true,
    "privacyFlag" TEXT,
    "mergedIntoPatientId" TEXT,
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
CREATE TABLE "tenant_sequences" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "scope_key" TEXT NOT NULL,
    "last_value" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_sequences_pkey" PRIMARY KEY ("id")
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
    "isSigned" BOOLEAN NOT NULL DEFAULT false,
    "signedAt" TIMESTAMP(3),
    "signedBy" TEXT,
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
    "appointmentId" TEXT,
    "consultationFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
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
CREATE TABLE "opd_bill_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "itemCode" TEXT,
    "itemName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "taxPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opd_bill_items_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" TEXT NOT NULL,
    "platform_user_id" TEXT,
    "hospital_user_id" TEXT,
    "device_name" TEXT,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_otps" (
    "id" TEXT NOT NULL,
    "platform_user_id" TEXT,
    "hospital_user_id" TEXT,
    "otp_hash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_otps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "global_masters" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "category" "MasterCategory" NOT NULL,
    "type" "MasterValueType" NOT NULL,
    "value" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_masters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "panels" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "panelCode" TEXT NOT NULL,
    "panelName" TEXT NOT NULL,
    "groupTypeId" TEXT,
    "paymentModeId" TEXT,
    "panelTypeId" TEXT,
    "contactPerson" TEXT,
    "address1" TEXT,
    "address2" TEXT,
    "contactNo" TEXT,
    "phoneNo" TEXT,
    "email" TEXT,
    "faxNo" TEXT,
    "validFrom" DATE,
    "validTo" DATE,
    "creditLimit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "opdTariffId" TEXT,
    "ipdTariffId" TEXT,
    "rateTypeSelfOpd" BOOLEAN NOT NULL DEFAULT false,
    "rateTypeSelfIpd" BOOLEAN NOT NULL DEFAULT false,
    "showPrintout" BOOLEAN NOT NULL DEFAULT true,
    "hideRate" BOOLEAN NOT NULL DEFAULT false,
    "coverNote" BOOLEAN NOT NULL DEFAULT false,
    "isSmartCard" BOOLEAN NOT NULL DEFAULT false,
    "hasEncounter" BOOLEAN NOT NULL DEFAULT false,
    "isUsdBased" BOOLEAN NOT NULL DEFAULT false,
    "dietTypePrivate" BOOLEAN NOT NULL DEFAULT false,
    "coPaymentOn" "CoPaymentOn" NOT NULL DEFAULT 'NONE',
    "coPaymentPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "rateCurrencyId" TEXT,
    "billCurrencyId" TEXT,
    "currencyConv" DECIMAL(10,4) NOT NULL DEFAULT 1,
    "panelAmount" DECIMAL(15,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "panels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_masters" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "serviceCode" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "category" "ServiceCategory" NOT NULL,
    "baseRate" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_masters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tariff_masters" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tariffCode" TEXT NOT NULL,
    "tariffName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tariff_masters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "panel_service_rates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tariffId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "rate" DECIMAL(10,2) NOT NULL,
    "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "panel_service_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_users_email_key" ON "platform_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "modules_code_key" ON "modules"("code");

-- CreateIndex
CREATE UNIQUE INDEX "features_code_key" ON "features"("code");

-- CreateIndex
CREATE UNIQUE INDEX "packages_name_key" ON "packages"("name");

-- CreateIndex
CREATE UNIQUE INDEX "hospitals_tenantId_key" ON "hospitals"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "hospitals_code_key" ON "hospitals"("code");

-- CreateIndex
CREATE UNIQUE INDEX "hospitals_email_key" ON "hospitals"("email");

-- CreateIndex
CREATE INDEX "assigned_packages_tenantId_idx" ON "assigned_packages"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "role_names_code_key" ON "role_names"("code");

-- CreateIndex
CREATE INDEX "hospital_roles_tenantId_idx" ON "hospital_roles"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "hospital_roles_tenantId_roleNameId_key" ON "hospital_roles"("tenantId", "roleNameId");

-- CreateIndex
CREATE UNIQUE INDEX "hospital_role_permissions_hospitalRoleId_moduleId_featureId_key" ON "hospital_role_permissions"("hospitalRoleId", "moduleId", "featureId");

-- CreateIndex
CREATE INDEX "departments_tenantId_idx" ON "departments"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "departments_tenantId_name_key" ON "departments"("tenantId", "name");

-- CreateIndex
CREATE INDEX "shift_masters_tenantId_idx" ON "shift_masters"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "shift_masters_tenantId_name_key" ON "shift_masters"("tenantId", "name");

-- CreateIndex
CREATE INDEX "hospital_users_tenantId_idx" ON "hospital_users"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "hospital_users_tenantId_username_key" ON "hospital_users"("tenantId", "username");

-- CreateIndex
CREATE UNIQUE INDEX "hospital_users_tenantId_email_key" ON "hospital_users"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "staff_profiles_userId_key" ON "staff_profiles"("userId");

-- CreateIndex
CREATE INDEX "staff_profiles_tenantId_idx" ON "staff_profiles"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "staff_profiles_tenantId_employeeId_key" ON "staff_profiles"("tenantId", "employeeId");

-- CreateIndex
CREATE INDEX "user_role_assignments_hospitalRoleId_idx" ON "user_role_assignments"("hospitalRoleId");

-- CreateIndex
CREATE INDEX "user_department_mappings_departmentId_idx" ON "user_department_mappings"("departmentId");

-- CreateIndex
CREATE INDEX "user_module_feature_permissions_userId_idx" ON "user_module_feature_permissions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_module_feature_permissions_userId_moduleId_featureId_key" ON "user_module_feature_permissions"("userId", "moduleId", "featureId");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_profiles_hospitalUserId_key" ON "doctor_profiles"("hospitalUserId");

-- CreateIndex
CREATE INDEX "doctor_profiles_tenantId_idx" ON "doctor_profiles"("tenantId");

-- CreateIndex
CREATE INDEX "doctor_availabilities_tenantId_doctorProfileId_idx" ON "doctor_availabilities"("tenantId", "doctorProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_availabilities_doctorProfileId_dayOfWeek_startTime_key" ON "doctor_availabilities"("doctorProfileId", "dayOfWeek", "startTime");

-- CreateIndex
CREATE INDEX "doctor_leave_blocks_tenantId_doctorProfileId_blockDate_idx" ON "doctor_leave_blocks"("tenantId", "doctorProfileId", "blockDate");

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
CREATE UNIQUE INDEX "patients_tenantId_id_key" ON "patients"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "patients_tenantId_uhid_key" ON "patients"("tenantId", "uhid");

-- CreateIndex
CREATE UNIQUE INDEX "patients_tenantId_mobile_key" ON "patients"("tenantId", "mobile");

-- CreateIndex
CREATE INDEX "tenant_sequences_tenant_id_entity_type_idx" ON "tenant_sequences"("tenant_id", "entity_type");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_sequences_tenant_id_entity_type_scope_key_key" ON "tenant_sequences"("tenant_id", "entity_type", "scope_key");

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
CREATE UNIQUE INDEX "appointments_tenantId_id_key" ON "appointments"("tenantId", "id");

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
CREATE INDEX "opd_bill_items_tenantId_billId_idx" ON "opd_bill_items"("tenantId", "billId");

-- CreateIndex
CREATE INDEX "opd_payments_tenantId_billId_idx" ON "opd_payments"("tenantId", "billId");

-- CreateIndex
CREATE UNIQUE INDEX "opd_payments_tenantId_receiptNo_key" ON "opd_payments"("tenantId", "receiptNo");

-- CreateIndex
CREATE INDEX "audit_logs_tenantId_idx" ON "audit_logs"("tenantId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "auth_sessions_platform_user_id_is_active_idx" ON "auth_sessions"("platform_user_id", "is_active");

-- CreateIndex
CREATE INDEX "auth_sessions_hospital_user_id_is_active_idx" ON "auth_sessions"("hospital_user_id", "is_active");

-- CreateIndex
CREATE INDEX "login_otps_platform_user_id_expires_at_idx" ON "login_otps"("platform_user_id", "expires_at");

-- CreateIndex
CREATE INDEX "login_otps_hospital_user_id_expires_at_idx" ON "login_otps"("hospital_user_id", "expires_at");

-- CreateIndex
CREATE INDEX "global_masters_tenantId_category_idx" ON "global_masters"("tenantId", "category");

-- CreateIndex
CREATE INDEX "global_masters_tenantId_type_idx" ON "global_masters"("tenantId", "type");

-- CreateIndex
CREATE INDEX "global_masters_tenantId_deletedAt_idx" ON "global_masters"("tenantId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "global_masters_tenantId_type_value_key" ON "global_masters"("tenantId", "type", "value");

-- CreateIndex
CREATE INDEX "panels_tenantId_groupTypeId_idx" ON "panels"("tenantId", "groupTypeId");

-- CreateIndex
CREATE INDEX "panels_tenantId_isActive_idx" ON "panels"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "panels_tenantId_panelCode_key" ON "panels"("tenantId", "panelCode");

-- CreateIndex
CREATE UNIQUE INDEX "panels_tenantId_panelName_key" ON "panels"("tenantId", "panelName");

-- CreateIndex
CREATE INDEX "service_masters_tenantId_category_idx" ON "service_masters"("tenantId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "service_masters_tenantId_serviceCode_key" ON "service_masters"("tenantId", "serviceCode");

-- CreateIndex
CREATE INDEX "tariff_masters_tenantId_isActive_idx" ON "tariff_masters"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "tariff_masters_tenantId_tariffCode_key" ON "tariff_masters"("tenantId", "tariffCode");

-- CreateIndex
CREATE INDEX "panel_service_rates_tenantId_tariffId_idx" ON "panel_service_rates"("tenantId", "tariffId");

-- CreateIndex
CREATE UNIQUE INDEX "panel_service_rates_tariffId_serviceId_key" ON "panel_service_rates"("tariffId", "serviceId");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "platform_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "assigned_packages" ADD CONSTRAINT "assigned_packages_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assigned_packages" ADD CONSTRAINT "assigned_packages_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_names" ADD CONSTRAINT "role_names_createdByTenantId_fkey" FOREIGN KEY ("createdByTenantId") REFERENCES "hospitals"("tenantId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital_roles" ADD CONSTRAINT "hospital_roles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital_roles" ADD CONSTRAINT "hospital_roles_roleNameId_fkey" FOREIGN KEY ("roleNameId") REFERENCES "role_names"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital_role_permissions" ADD CONSTRAINT "hospital_role_permissions_hospitalRoleId_fkey" FOREIGN KEY ("hospitalRoleId") REFERENCES "hospital_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital_role_permissions" ADD CONSTRAINT "hospital_role_permissions_moduleId_featureId_fkey" FOREIGN KEY ("moduleId", "featureId") REFERENCES "module_features"("moduleId", "featureId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_masters" ADD CONSTRAINT "shift_masters_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital_users" ADD CONSTRAINT "hospital_users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "doctor_profiles" ADD CONSTRAINT "doctor_profiles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_profiles" ADD CONSTRAINT "doctor_profiles_hospitalUserId_fkey" FOREIGN KEY ("hospitalUserId") REFERENCES "hospital_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_availabilities" ADD CONSTRAINT "doctor_availabilities_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_availabilities" ADD CONSTRAINT "doctor_availabilities_doctorProfileId_fkey" FOREIGN KEY ("doctorProfileId") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_leave_blocks" ADD CONSTRAINT "doctor_leave_blocks_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_leave_blocks" ADD CONSTRAINT "doctor_leave_blocks_doctorProfileId_fkey" FOREIGN KEY ("doctorProfileId") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_mergedIntoPatientId_fkey" FOREIGN KEY ("mergedIntoPatientId") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_sequences" ADD CONSTRAINT "tenant_sequences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "patient_vitals" ADD CONSTRAINT "patient_vitals_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "opd_bills" ADD CONSTRAINT "opd_bills_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opd_bill_items" ADD CONSTRAINT "opd_bill_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opd_bill_items" ADD CONSTRAINT "opd_bill_items_billId_fkey" FOREIGN KEY ("billId") REFERENCES "opd_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opd_payments" ADD CONSTRAINT "opd_payments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opd_payments" ADD CONSTRAINT "opd_payments_billId_fkey" FOREIGN KEY ("billId") REFERENCES "opd_bills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_platform_user_id_fkey" FOREIGN KEY ("platform_user_id") REFERENCES "platform_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_hospital_user_id_fkey" FOREIGN KEY ("hospital_user_id") REFERENCES "hospital_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_otps" ADD CONSTRAINT "login_otps_platform_user_id_fkey" FOREIGN KEY ("platform_user_id") REFERENCES "platform_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_otps" ADD CONSTRAINT "login_otps_hospital_user_id_fkey" FOREIGN KEY ("hospital_user_id") REFERENCES "hospital_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "global_masters" ADD CONSTRAINT "global_masters_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "panels" ADD CONSTRAINT "panels_opdTariffId_fkey" FOREIGN KEY ("opdTariffId") REFERENCES "tariff_masters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "panels" ADD CONSTRAINT "panels_ipdTariffId_fkey" FOREIGN KEY ("ipdTariffId") REFERENCES "tariff_masters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "panels" ADD CONSTRAINT "panels_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "panels" ADD CONSTRAINT "panels_groupTypeId_fkey" FOREIGN KEY ("groupTypeId") REFERENCES "global_masters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "panels" ADD CONSTRAINT "panels_paymentModeId_fkey" FOREIGN KEY ("paymentModeId") REFERENCES "global_masters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "panels" ADD CONSTRAINT "panels_panelTypeId_fkey" FOREIGN KEY ("panelTypeId") REFERENCES "global_masters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "panels" ADD CONSTRAINT "panels_rateCurrencyId_fkey" FOREIGN KEY ("rateCurrencyId") REFERENCES "global_masters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "panels" ADD CONSTRAINT "panels_billCurrencyId_fkey" FOREIGN KEY ("billCurrencyId") REFERENCES "global_masters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_masters" ADD CONSTRAINT "service_masters_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tariff_masters" ADD CONSTRAINT "tariff_masters_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "panel_service_rates" ADD CONSTRAINT "panel_service_rates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "hospitals"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "panel_service_rates" ADD CONSTRAINT "panel_service_rates_tariffId_fkey" FOREIGN KEY ("tariffId") REFERENCES "tariff_masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "panel_service_rates" ADD CONSTRAINT "panel_service_rates_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "service_masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
