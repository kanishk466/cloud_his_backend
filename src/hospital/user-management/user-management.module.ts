import { Module } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

import { RoleNameController } from './controllers/role-name.controller';
import { HospitalRoleController } from './controllers/hospital-role.controller';
import { HospitalUserController } from './controllers/hospital-user.controller';

import { RoleNameService } from './services/role-name.service';
import { HospitalRoleService } from './services/hospital-role.service';
import { HospitalUserService } from './services/hospital-user.service';
import { TenantValidationService } from './services/tenant-validation.service';

import { RoleNameRepository } from './repositories/role-name.repository';
import { HospitalRoleRepository } from './repositories/hospital-role.repository';
import { HospitalUserRepository } from './repositories/hospital-user.repository';
import { EntitlementRepository } from './repositories/entitlement.repository';

@Module({
  controllers: [
    RoleNameController,
    HospitalRoleController,
    HospitalUserController,
  ],
  providers: [
    PrismaService,

    RoleNameService,
    RoleNameRepository,

    HospitalRoleService,
    HospitalRoleRepository,

    HospitalUserService,
    HospitalUserRepository,

    TenantValidationService,
    EntitlementRepository,
  ],
  exports: [
    RoleNameService,
    HospitalRoleService,
    HospitalUserService,
    EntitlementRepository,
  ],
})
export class UserManagementModule {}