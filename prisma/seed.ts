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


  // ========================
  // 2. MODULES (Updated additions)
  // ========================
  const modulesData = [
    // ... existing modules ...
    {
      name: 'Dashboard',
      code: 'DASHBOARD',
      route: '/dashboard',
      icon: 'dashboard',
      sortOrder: 1,
    },
    {
      name: 'Patient Registration',
      code: 'PATIENT_REGISTRATION',
      route: '/patients/register',
      icon: 'person-add',
      sortOrder: 2,
    },
    {
      name: 'Appointments',
      code: 'APPOINTMENTS',
      route: '/appointments',
      icon: 'calendar',
      sortOrder: 3,
    },
    {
      name: 'OPD Examination',
      code: 'OPD_EXAMINATION',
      route: '/opd',
      icon: 'stethoscope',
      sortOrder: 4,
    },
    {
      name: 'Consultation',
      code: 'CONSULTATION',
      route: '/consultation',
      icon: 'medical',
      sortOrder: 5,
    },
    {
      name: 'Teleconsultation',
      code: 'TELECONSULTATION',
      route: '/teleconsultation',
      icon: 'video',
      sortOrder: 6,
    },
    {
      name: 'Billing',
      code: 'BILLING',
      route: '/billing',
      icon: 'receipt',
      sortOrder: 7,
    },
    {
      name: 'Pharmacy',
      code: 'PHARMACY',
      route: '/pharmacy',
      icon: 'medicine',
      sortOrder: 8,
    },
    {
      name: 'Lab & Radiology',
      code: 'LAB_RADIOLOGY',
      route: '/lab',
      icon: 'lab',
      sortOrder: 9,
    },
    {
      name: 'Patients',
      code: 'PATIENTS',
      route: '/patients',
      icon: 'people',
      sortOrder: 10,
    },
    {
      name: 'Reports',
      code: 'REPORTS',
      route: '/reports',
      icon: 'bar-chart',
      sortOrder: 11,
    },
    {
      name: 'Master Config',
      code: 'MASTER_CONFIG',
      route: '/master-config',
      icon: 'settings',
      sortOrder: 12,
    },
    {
      name: 'User Management',
      code: 'USER_MANAGEMENT',
      route: '/users/new',
      icon: 'user-plus',
      sortOrder: 13,
    },
    {
      name: 'Roles & Permissions',
      code: 'ROLES_PERMISSIONS',
      route: '/roles',
      icon: 'shield-check',
      sortOrder: 14,
    },
    {
      name: 'Insurance & Panel',
      code: 'INSURANCE_PANEL',
      route: '/insurance',
      icon: 'shield',
      sortOrder: 15,
    },
    {
      name: 'Discharge Summary',
      code: 'DISCHARGE_SUMMARY',
      route: '/discharge',
      icon: 'document',
      sortOrder: 16,
    },
    {
      name: 'IPD Management',
      code: 'IPD_MANAGEMENT',
      route: '/ipd',
      icon: 'bed',
      sortOrder: 17,
    },
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

  const moduleFeaturesData: Record<
    string,
    { name: string; code: string; description?: string }[]
  > = {
    // ... existing features ...

    // Update existing PATIENT_REGISTRATION (already there, kept as-is)
    PATIENT_REGISTRATION: [
      { name: 'View Patients', code: 'PATIENT_REG_VIEW' },
      { name: 'Register Patient', code: 'PATIENT_REG_CREATE' },
      { name: 'Edit Patient', code: 'PATIENT_REG_EDIT' },
      { name: 'Delete Patient', code: 'PATIENT_REG_DELETE' },
      { name: 'Print Patient Card', code: 'PATIENT_REG_PRINT' },
      { name: 'Export Patients', code: 'PATIENT_REG_EXPORT' },
      { name: 'Bulk Upload', code: 'PATIENT_REG_BULK_UPLOAD' },
      { name: 'Search Patient', code: 'PATIENT_REG_SEARCH' },
      { name: 'View Patient History', code: 'PATIENT_REG_HISTORY' },
    ],

    // Updated USER_MANAGEMENT (route /users/new - Add User focus)
    USER_MANAGEMENT: [
      { name: 'View Users', code: 'USER_MGMT_VIEW' },
      { name: 'Add User', code: 'USER_MGMT_CREATE' },
      { name: 'Edit User', code: 'USER_MGMT_EDIT' },
      { name: 'Delete User', code: 'USER_MGMT_DELETE' },
      { name: 'Deactivate User', code: 'USER_MGMT_DEACTIVATE' },
      { name: 'Activate User', code: 'USER_MGMT_ACTIVATE' },
      { name: 'Reset Password', code: 'USER_MGMT_RESET_PASSWORD' },
      { name: 'Assign Role', code: 'USER_MGMT_ASSIGN_ROLE' },
      { name: 'Export Users', code: 'USER_MGMT_EXPORT' },
      { name: 'View User Activity', code: 'USER_MGMT_ACTIVITY' },
    ],

    // NEW: Roles & Permissions module
    ROLES_PERMISSIONS: [
      { name: 'View Roles', code: 'ROLES_VIEW' },
      { name: 'Create Role', code: 'ROLES_CREATE' },
      { name: 'Edit Role', code: 'ROLES_EDIT' },
      { name: 'Delete Role', code: 'ROLES_DELETE' },
      { name: 'Clone Role', code: 'ROLES_CLONE' },
      { name: 'View Permissions', code: 'PERMISSIONS_VIEW' },
      { name: 'Assign Permissions', code: 'PERMISSIONS_ASSIGN' },
      { name: 'Revoke Permissions', code: 'PERMISSIONS_REVOKE' },
      { name: 'Manage Module Access', code: 'PERMISSIONS_MODULE_ACCESS' },
      { name: 'Manage Feature Access', code: 'PERMISSIONS_FEATURE_ACCESS' },
      { name: 'Export Role Matrix', code: 'ROLES_EXPORT' },
    ],

    // Updated MASTER_CONFIG with more features
    MASTER_CONFIG: [
      { name: 'View Master Config', code: 'MASTER_VIEW' },
      { name: 'Manage Departments', code: 'MASTER_DEPARTMENTS' },
      { name: 'Manage Shifts', code: 'MASTER_SHIFTS' },
      { name: 'Manage Services', code: 'MASTER_SERVICES' },
      { name: 'Manage Charges', code: 'MASTER_CHARGES' },
      { name: 'Hospital Settings', code: 'MASTER_SETTINGS' },
      { name: 'Manage Doctors', code: 'MASTER_DOCTORS' },
      { name: 'Manage Specializations', code: 'MASTER_SPECIALIZATIONS' },
      { name: 'Manage Branches', code: 'MASTER_BRANCHES' },
      { name: 'Manage Wards & Beds', code: 'MASTER_WARDS_BEDS' },
      { name: 'Manage Taxes', code: 'MASTER_TAXES' },
      { name: 'Manage Payment Modes', code: 'MASTER_PAYMENT_MODES' },
      { name: 'Manage Templates', code: 'MASTER_TEMPLATES' },
      { name: 'Backup & Restore', code: 'MASTER_BACKUP' },
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

    console.log(
      `  ✅ Module [${moduleCode}]: ${features.length} features linked`,
    );
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
      where: {
        name: pkg.name,
      },
      update: pkg,
      create: pkg,
    });

    console.log(
      `  ✅ Package: ${created.name} (₹${created.monthlyPrice}/mo, ${created.maxDoctors} doctors)`,
    );
  }

  // ========================
  // 5. PACKAGE → MODULE MAPPING
  // ========================
  console.log('\n📌 Assigning Modules to Packages...');

  const packageModules: Record<string, string[]> = {
    FREE: ['DASHBOARD', 'PATIENT_REGISTRATION', 'APPOINTMENTS'],

    BASIC: [
      'DASHBOARD',
      'PATIENT_REGISTRATION',
      'APPOINTMENTS',
      'OPD_EXAMINATION',
      'CONSULTATION',
      'PATIENTS',
      'BILLING',
    ],

    PREMIUM: [
      'DASHBOARD',
      'PATIENT_REGISTRATION',
      'APPOINTMENTS',
      'OPD_EXAMINATION',
      'CONSULTATION',
      'TELECONSULTATION',
      'BILLING',
      'PHARMACY',
      'LAB_RADIOLOGY',
      'PATIENTS',
      'REPORTS',
      'DISCHARGE_SUMMARY',
    ],

    ENTERPRISE: [
      'DASHBOARD',
      'PATIENT_REGISTRATION',
      'APPOINTMENTS',
      'OPD_EXAMINATION',
      'CONSULTATION',
      'TELECONSULTATION',
      'BILLING',
      'PHARMACY',
      'LAB_RADIOLOGY',
      'PATIENTS',
      'REPORTS',
      'MASTER_CONFIG',
      'USER_MANAGEMENT',
      'INSURANCE_PANEL',
      'DISCHARGE_SUMMARY',
      'IPD_MANAGEMENT',
    ],
  };

  for (const [packageName, moduleCodes] of Object.entries(packageModules)) {
    const pkg = await prisma.package.findUnique({
      where: {
        name: packageName,
      },
    });

    if (!pkg) {
      console.warn(`  ⚠️ Package not found: ${packageName}`);
      continue;
    }

    for (const moduleCode of moduleCodes) {
      const module = await prisma.module.findUnique({
        where: {
          code: moduleCode,
        },
      });

      if (!module) {
        console.warn(`  ⚠️ Module not found: ${moduleCode}`);
        continue;
      }

      await prisma.packageModule.upsert({
        where: {
          packageId_moduleId: {
            packageId: pkg.id,
            moduleId: module.id,
          },
        },
        update: {},
        create: {
          packageId: pkg.id,
          moduleId: module.id,
        },
      });
    }

    console.log(
      `  ✅ Package [${packageName}]: ${moduleCodes.length} modules assigned`,
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
  // const existingAuditLogs = await prisma.auditLog.count();

  // if (existingAuditLogs === 0) {
  //   const { count } = await prisma.auditLog.createMany({
  //     data: auditLogsData,
  //     skipDuplicates: true,
  //   });
  //   console.log(`  ✅ Audit logs inserted: ${count}`);
  // } else {
  //   console.log(
  //     `  ⏭️  Audit logs already present (${existingAuditLogs} rows) — skipping`,
  //   );
  // }

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
