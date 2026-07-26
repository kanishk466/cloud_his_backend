import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding started...');

  // ========================
  // 1. ROLE NAMES (Global)
  // ========================
  console.log('\n📌 Seeding RoleNames...');

  const roleNamesData = [
    {
      name: 'Hospital Admin',
      code: 'HOSPITAL_ADMIN',
      description: 'Full access to all hospital operations',
      isSystem: true,
    },
    {
      name: 'Doctor',
      code: 'DOCTOR',
      description: 'Clinical consultation and patient management',
      isSystem: true,
    },
    {
      name: 'Nurse',
      code: 'NURSE',
      description: 'Patient care and vitals management',
      isSystem: true,
    },
    {
      name: 'Receptionist',
      code: 'RECEPTIONIST',
      description: 'Front desk, appointments and patient registration',
      isSystem: true,
    },
    {
      name: 'Pharmacist',
      code: 'PHARMACIST',
      description: 'Pharmacy and medicine dispensing',
      isSystem: true,
    },
    {
      name: 'Lab Technician',
      code: 'LAB_TECHNICIAN',
      description: 'Lab tests and radiology reports',
      isSystem: true,
    },
    {
      name: 'Accountant',
      code: 'ACCOUNTANT',
      description: 'Billing, payments and financial reports',
      isSystem: true,
    },
    {
      name: 'Ward Boy',
      code: 'WARD_BOY',
      description: 'Ward assistance and patient support',
      isSystem: true,
    },
  ];

  for (const role of roleNamesData) {
    const created = await prisma.roleName.upsert({
      where: { code: role.code },
      update: {},
      create: role,
    });
    console.log(`  ✅ RoleName: ${created.name}`);
  }

  // ========================
  // 2. MODULES
  // ========================
  console.log('\n📌 Seeding Modules...');

  const modulesData = [
    { name: 'Dashboard', code: 'DASHBOARD', route: '/dashboard', icon: 'dashboard', sortOrder: 1 },
    { name: 'Patient Registration', code: 'PATIENT_REGISTRATION', route: '/patients/register', icon: 'person-add', sortOrder: 2 },
    { name: 'Appointments', code: 'APPOINTMENTS', route: '/appointments', icon: 'calendar', sortOrder: 3 },
    { name: 'OPD Examination', code: 'OPD_EXAMINATION', route: '/opd', icon: 'stethoscope', sortOrder: 4 },
    { name: 'Consultation', code: 'CONSULTATION', route: '/consultation', icon: 'medical', sortOrder: 5 },
    { name: 'Teleconsultation', code: 'TELECONSULTATION', route: '/teleconsultation', icon: 'video', sortOrder: 6 },
    { name: 'Billing', code: 'BILLING', route: '/billing', icon: 'receipt', sortOrder: 7 },
    { name: 'Pharmacy', code: 'PHARMACY', route: '/pharmacy', icon: 'medicine', sortOrder: 8 },
    { name: 'Lab & Radiology', code: 'LAB_RADIOLOGY', route: '/lab', icon: 'lab', sortOrder: 9 },
    { name: 'Patients', code: 'PATIENTS', route: '/patients', icon: 'people', sortOrder: 10 },
    { name: 'Reports', code: 'REPORTS', route: '/reports', icon: 'bar-chart', sortOrder: 11 },
    { name: 'Master Config', code: 'MASTER_CONFIG', route: '/master-config', icon: 'settings', sortOrder: 12 },
    { name: 'User Management', code: 'USER_MANAGEMENT', route: '/user-management', icon: 'users', sortOrder: 13 },
    { name: 'Insurance & Panel', code: 'INSURANCE_PANEL', route: '/insurance', icon: 'shield', sortOrder: 14 },
    { name: 'Discharge Summary', code: 'DISCHARGE_SUMMARY', route: '/discharge', icon: 'document', sortOrder: 15 },
    { name: 'IPD Management', code: 'IPD_MANAGEMENT', route: '/ipd', icon: 'bed', sortOrder: 16 },
  ];

  for (const mod of modulesData) {
    const created = await prisma.module.upsert({
      where: { code: mod.code },
      update: {},
      create: mod,
    });
    console.log(`  ✅ Module: ${created.name}`);
  }

  // ========================
  // 3. FEATURES + MODULE-FEATURE MAPPING
  // ========================
  console.log('\n📌 Seeding Features and ModuleFeatures...');

  const moduleFeaturesData: Record<string, { name: string; code: string; description?: string }[]> = {
    DASHBOARD: [
      { name: 'View Dashboard', code: 'DASHBOARD_VIEW' },
    ],
    PATIENT_REGISTRATION: [
      { name: 'View Patients', code: 'PATIENT_REG_VIEW' },
      { name: 'Register Patient', code: 'PATIENT_REG_CREATE' },
      { name: 'Edit Patient', code: 'PATIENT_REG_EDIT' },
      { name: 'Delete Patient', code: 'PATIENT_REG_DELETE' },
      { name: 'Print Patient Card', code: 'PATIENT_REG_PRINT' },
      { name: 'Export Patients', code: 'PATIENT_REG_EXPORT' },
      { name: 'Bulk Upload', code: 'PATIENT_REG_BULK_UPLOAD' },
    ],
    APPOINTMENTS: [
      { name: 'View Appointments', code: 'APPT_VIEW' },
      { name: 'Create Appointment', code: 'APPT_CREATE' },
      { name: 'Edit Appointment', code: 'APPT_EDIT' },
      { name: 'Cancel Appointment', code: 'APPT_CANCEL' },
      { name: 'Print Appointment', code: 'APPT_PRINT' },
      { name: 'Send SMS / WhatsApp', code: 'APPT_SEND_SMS' },
    ],
    OPD_EXAMINATION: [
      { name: 'View OPD', code: 'OPD_VIEW' },
      { name: 'Add Vitals', code: 'OPD_ADD_VITALS' },
      { name: 'Edit Vitals', code: 'OPD_EDIT_VITALS' },
      { name: 'Print OPD Sheet', code: 'OPD_PRINT' },
    ],
    CONSULTATION: [
      { name: 'View Consultation', code: 'CONSULT_VIEW' },
      { name: 'Create Consultation', code: 'CONSULT_CREATE' },
      { name: 'Edit Consultation', code: 'CONSULT_EDIT' },
      { name: 'Write Prescription', code: 'CONSULT_PRESCRIPTION' },
      { name: 'Print Prescription', code: 'CONSULT_PRINT' },
      { name: 'Reopen Closed Record', code: 'CONSULT_REOPEN' },
    ],
    TELECONSULTATION: [
      { name: 'View Teleconsultation', code: 'TELECONSULT_VIEW' },
      { name: 'Start Teleconsultation', code: 'TELECONSULT_START' },
      { name: 'Write Prescription', code: 'TELECONSULT_PRESCRIPTION' },
    ],
    BILLING: [
      { name: 'View Bills', code: 'BILLING_VIEW' },
      { name: 'Create Bill', code: 'BILLING_CREATE' },
      { name: 'Edit Bill', code: 'BILLING_EDIT' },
      { name: 'Delete Bill', code: 'BILLING_DELETE' },
      { name: 'Print Bill', code: 'BILLING_PRINT' },
      { name: 'Export Bills', code: 'BILLING_EXPORT' },
      { name: 'Approve / Verify', code: 'BILLING_APPROVE' },
      { name: 'Cancel / Void', code: 'BILLING_CANCEL' },
      { name: 'Refund', code: 'BILLING_REFUND' },
      { name: 'Discount Approval', code: 'BILLING_DISCOUNT' },
      { name: 'View Financial Data', code: 'BILLING_VIEW_FINANCIAL' },
      { name: 'Override Rate', code: 'BILLING_OVERRIDE_RATE' },
    ],
    PHARMACY: [
      { name: 'View Pharmacy', code: 'PHARMACY_VIEW' },
      { name: 'Dispense Medicine', code: 'PHARMACY_DISPENSE' },
      { name: 'Edit Dispensing', code: 'PHARMACY_EDIT' },
      { name: 'Return Medicine', code: 'PHARMACY_RETURN' },
      { name: 'Print Receipt', code: 'PHARMACY_PRINT' },
      { name: 'View Stock', code: 'PHARMACY_VIEW_STOCK' },
    ],
    LAB_RADIOLOGY: [
      { name: 'View Lab Reports', code: 'LAB_VIEW' },
      { name: 'Create Lab Order', code: 'LAB_CREATE' },
      { name: 'Enter Results', code: 'LAB_ENTER_RESULTS' },
      { name: 'Approve Results', code: 'LAB_APPROVE' },
      { name: 'Print Report', code: 'LAB_PRINT' },
      { name: 'Export Reports', code: 'LAB_EXPORT' },
    ],
    PATIENTS: [
      { name: 'View Patient Records', code: 'PATIENTS_VIEW' },
      { name: 'Edit Patient Records', code: 'PATIENTS_EDIT' },
      { name: 'View Medical History', code: 'PATIENTS_HISTORY' },
      { name: 'Export Patient Data', code: 'PATIENTS_EXPORT' },
    ],
    REPORTS: [
      { name: 'View Reports', code: 'REPORTS_VIEW' },
      { name: 'Export Reports', code: 'REPORTS_EXPORT' },
      { name: 'Access Audit Log', code: 'REPORTS_AUDIT_LOG' },
    ],
    MASTER_CONFIG: [
      { name: 'View Master Config', code: 'MASTER_VIEW' },
      { name: 'Manage Departments', code: 'MASTER_DEPARTMENTS' },
      { name: 'Manage Shifts', code: 'MASTER_SHIFTS' },
      { name: 'Manage Services', code: 'MASTER_SERVICES' },
      { name: 'Manage Charges', code: 'MASTER_CHARGES' },
      { name: 'Hospital Settings', code: 'MASTER_SETTINGS' },
    ],
    USER_MANAGEMENT: [
      { name: 'View Users', code: 'USER_MGMT_VIEW' },
      { name: 'Create User', code: 'USER_MGMT_CREATE' },
      { name: 'Edit User', code: 'USER_MGMT_EDIT' },
      { name: 'Deactivate User', code: 'USER_MGMT_DEACTIVATE' },
      { name: 'Reset Password', code: 'USER_MGMT_RESET_PASSWORD' },
      { name: 'Manage Roles', code: 'USER_MGMT_ROLES' },
      { name: 'Assign Permissions', code: 'USER_MGMT_PERMISSIONS' },
    ],
    INSURANCE_PANEL: [
      { name: 'View Insurance', code: 'INSURANCE_VIEW' },
      { name: 'Create Claim', code: 'INSURANCE_CREATE' },
      { name: 'Edit Claim', code: 'INSURANCE_EDIT' },
      { name: 'Approve Claim', code: 'INSURANCE_APPROVE' },
      { name: 'Export Claims', code: 'INSURANCE_EXPORT' },
    ],
    DISCHARGE_SUMMARY: [
      { name: 'View Discharge Summary', code: 'DISCHARGE_VIEW' },
      { name: 'Create Discharge Summary', code: 'DISCHARGE_CREATE' },
      { name: 'Edit Discharge Summary', code: 'DISCHARGE_EDIT' },
      { name: 'Print Discharge Summary', code: 'DISCHARGE_PRINT' },
      { name: 'Approve Discharge', code: 'DISCHARGE_APPROVE' },
    ],
    IPD_MANAGEMENT: [
      { name: 'View IPD', code: 'IPD_VIEW' },
      { name: 'Admit Patient', code: 'IPD_ADMIT' },
      { name: 'Edit Admission', code: 'IPD_EDIT' },
      { name: 'Discharge Patient', code: 'IPD_DISCHARGE' },
      { name: 'Manage Bed', code: 'IPD_BED_MANAGE' },
      { name: 'Print IPD Sheet', code: 'IPD_PRINT' },
    ],
  };

  let featureCount = 0;
  let moduleFeatCount = 0;

  for (const [moduleCode, features] of Object.entries(moduleFeaturesData)) {
    const module = await prisma.module.findUnique({
      where: { code: moduleCode },
    });

    if (!module) {
      console.warn(`  ⚠️ Module not found: ${moduleCode}`);
      continue;
    }

    for (const feat of features) {
      // Upsert Feature
      const savedFeat = await prisma.feature.upsert({
        where: { code: feat.code },
        update: {},
        create: {
          name: feat.name,
          code: feat.code,
          description: feat.description ?? null,
        },
      });
      featureCount++;

      // Upsert ModuleFeature link
      await prisma.moduleFeature.upsert({
        where: {
          moduleId_featureId: {
            moduleId: module.id,
            featureId: savedFeat.id,
          },
        },
        update: {},
        create: {
          moduleId: module.id,
          featureId: savedFeat.id,
        },
      });
      moduleFeatCount++;
    }

    console.log(`  ✅ Module [${moduleCode}]: ${features.length} features linked`);
  }

  // ========================
  // 4. PACKAGES
  // ========================
  console.log('\n📌 Seeding Packages...');

  const packagesData = [
    {
      name: 'FREE',
      description: 'Trial plan for single-clinic evaluation',
      monthlyPrice: 0,
      yearlyPrice: 0,
      maxDoctors: 3,
      maxStorageGb: 2,
      maxBranches: 1,
      isPopular: false,
    },
    {
      name: 'BASIC',
      description: 'Essentials for a small hospital or two branches',
      monthlyPrice: 2999,
      yearlyPrice: 29990,
      maxDoctors: 10,
      maxStorageGb: 25,
      maxBranches: 2,
      isPopular: false,
    },
    {
      name: 'PREMIUM',
      description: 'Full clinical suite for growing multi-branch hospitals',
      monthlyPrice: 7999,
      yearlyPrice: 79990,
      maxDoctors: 25,
      maxStorageGb: 150,
      maxBranches: 5,
      isPopular: true,
    },
    {
      name: 'ENTERPRISE',
      description: 'Unrestricted scale for hospital groups and chains',
      monthlyPrice: 19999,
      yearlyPrice: 199990,
      maxDoctors: 100,
      maxStorageGb: 1024,
      maxBranches: 20,
      isPopular: false,
    },
  ];

  for (const pkg of packagesData) {
    const created = await prisma.package.upsert({
      where: { name: pkg.name },
      update: pkg,
      create: pkg,
    });
    console.log(
      `  ✅ Package: ${created.name} (₹${created.monthlyPrice}/mo, ${created.maxDoctors} doctors)`,
    );
  }

  // ========================
  // 5. PLATFORM ADMIN USER
  // ========================
  console.log('\n📌 Seeding Platform Admin...');

  const passwordHash = await bcrypt.hash('Admin@123', 10);

  const platformAdmin = await prisma.platformUser.upsert({
    where: { email: 'admin@platform.com' },
    update: {},
    create: {
      email: 'admin@platform.com',
      passwordHash,
      firstName: 'Platform',
      lastName: 'Admin',
      status: 'ACTIVE',
    },
  });

  console.log(`  ✅ Platform Admin: ${platformAdmin.email}`);

  // ========================
  // 6. AUDIT LOGS (sample activity feed)
  // ========================
  console.log('\n📌 Seeding Audit Logs...');

  const auditActor = {
    actorId: platformAdmin.id,
    actorEmail: platformAdmin.email,
  };

  const auditLogsData = [
    {
      ...auditActor,
      action: 'HOSPITAL_CREATED',
      targetType: 'Hospital',
      targetName: 'Apollo Multispeciality',
      detail: 'Hospital created with code APOLLO01',
    },
    {
      ...auditActor,
      action: 'PACKAGE_CREATED',
      targetType: 'Package',
      targetName: 'PREMIUM',
      detail: 'Package created at 7999/month',
    },
    {
      ...auditActor,
      action: 'HOSPITAL_CREATED',
      targetType: 'Hospital',
      targetName: 'Sunrise Childrens Clinic',
      detail: 'Hospital created with code SUNRISE01',
    },
    {
      ...auditActor,
      action: 'PACKAGE_UPDATED',
      targetType: 'Package',
      targetName: 'BASIC',
      detail: 'Fields updated: monthlyPrice, maxDoctors',
    },
    {
      ...auditActor,
      action: 'HOSPITAL_SUSPENDED',
      targetType: 'Hospital',
      targetName: 'Sunrise Childrens Clinic',
      detail: 'Suspended for non-payment',
    },
    {
      ...auditActor,
      action: 'USER_PASSWORD_RESET',
      targetType: 'PlatformUser',
      targetName: 'admin@platform.com',
      detail: 'Password reset for admin@platform.com',
    },
    {
      ...auditActor,
      action: 'HOSPITAL_REACTIVATED',
      targetType: 'Hospital',
      targetName: 'Sunrise Childrens Clinic',
      detail: 'Payment cleared, hospital reactivated',
    },
    {
      ...auditActor,
      action: 'PACKAGE_CREATED',
      targetType: 'Package',
      targetName: 'ENTERPRISE',
      detail: 'Package created at 19999/month',
    },
    {
      ...auditActor,
      action: 'PACKAGE_DELETED',
      targetType: 'Package',
      targetName: 'LEGACY_TRIAL',
      detail: 'Deprecated package removed from catalogue',
    },
    {
      ...auditActor,
      action: 'HOSPITAL_CREATED',
      targetType: 'Hospital',
      targetName: 'City Care Hospital',
      detail: 'Hospital created with code CITYCARE01',
    },
  ];

  // AuditLog has no natural unique key, so guard on current row count to keep
  // re-runs idempotent (skipDuplicates only dedupes on unique constraints).
  const existingAuditLogs = await prisma.auditLog.count();

  if (existingAuditLogs === 0) {
    const { count } = await prisma.auditLog.createMany({
      data: auditLogsData,
      skipDuplicates: true,
    });
    console.log(`  ✅ Audit logs inserted: ${count}`);
  } else {
    console.log(
      `  ⏭️  Audit logs already present (${existingAuditLogs} rows) — skipping`,
    );
  }

  // ========================
  // SUMMARY
  // ========================
  console.log('\n🎉 Seeding completed!');
  console.log(`   RoleNames : ${roleNamesData.length}`);
  console.log(`   Modules   : ${modulesData.length}`);
  console.log(`   Features  : ${featureCount}`);
  console.log(`   ModFeat   : ${moduleFeatCount}`);
  console.log(`   Packages  : ${packagesData.length}`);
  console.log(`   AuditLogs : ${await prisma.auditLog.count()}`);
  console.log(`   Platform Admin : ${platformAdmin.email}`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });