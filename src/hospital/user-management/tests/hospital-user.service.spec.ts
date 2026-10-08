import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { HospitalUserService } from '../services/hospital-user.service';
import { HospitalUserRepository } from '../repositories/hospital-user.repository';
import { TenantValidationService } from '../services/tenant-validation.service';
import { HospitalUserStatus, HospitalUserType } from '@prisma/client';

// Mock repository
const mockUserRepository = {
  findByEmailWithHospital: jest.fn(),
  findByUsername: jest.fn(),
  generateEmployeeId: jest.fn(),
  createFull: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  getEffectivePermissions: jest.fn(),
  updateProfile: jest.fn(),
  setStatusWithSessionRevoke: jest.fn(),
  softDelete: jest.fn(),
  syncDepartments: jest.fn(),
  syncRoles: jest.fn(),
  resetPassword: jest.fn(),
  countActiveSuperAdmins: jest.fn(),
};

const mockTenantValidationService = {
  validateReferences: jest.fn(),
};

describe('HospitalUserService', () => {
  let service: HospitalUserService;

  const tenantId = 'tenant-uuid';
  const userId = 'user-uuid';
  const performedBy = 'admin-uuid';

  const activeUser = {
    id: userId,
    tenantId,
    userType: HospitalUserType.REGULAR_USER,
    status: HospitalUserStatus.ACTIVE,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HospitalUserService,
        { provide: HospitalUserRepository, useValue: mockUserRepository },
        {
          provide: TenantValidationService,
          useValue: mockTenantValidationService,
        },
      ],
    }).compile();

    service = module.get<HospitalUserService>(HospitalUserService);

    jest.clearAllMocks();
  });

  // --- STATUS TOGGLE TESTS ------------------------------------------
  describe('updateStatus', () => {
    it('should deactivate a user and revoke sessions', async () => {
      mockUserRepository.findById.mockResolvedValue(activeUser);
      mockUserRepository.setStatusWithSessionRevoke.mockResolvedValue({
        ...activeUser,
        status: HospitalUserStatus.INACTIVE,
      });

      const result = await service.updateStatus(
        tenantId,
        userId,
        HospitalUserStatus.INACTIVE,
        performedBy,
      );

      expect(result.status).toBe(HospitalUserStatus.INACTIVE);
      expect(
        mockUserRepository.setStatusWithSessionRevoke,
      ).toHaveBeenCalledWith(
        userId,
        tenantId,
        HospitalUserStatus.INACTIVE,
        performedBy,
      );
    });

    it('should reactivate a user without session revocation', async () => {
      mockUserRepository.findById.mockResolvedValue({
        ...activeUser,
        status: HospitalUserStatus.INACTIVE,
      });
      mockUserRepository.setStatusWithSessionRevoke.mockResolvedValue(
        activeUser,
      );

      const result = await service.updateStatus(
        tenantId,
        userId,
        HospitalUserStatus.ACTIVE,
        performedBy,
      );

      expect(result.status).toBe(HospitalUserStatus.ACTIVE);
      expect(mockUserRepository.countActiveSuperAdmins).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateStatus(
          tenantId,
          userId,
          HospitalUserStatus.INACTIVE,
          performedBy,
        ),
      ).rejects.toThrow(NotFoundException);

      expect(
        mockUserRepository.setStatusWithSessionRevoke,
      ).not.toHaveBeenCalled();
    });

    it('should block deactivating the last active SUPER_ADMIN', async () => {
      mockUserRepository.findById.mockResolvedValue({
        ...activeUser,
        userType: HospitalUserType.SUPER_ADMIN,
      });
      mockUserRepository.countActiveSuperAdmins.mockResolvedValue(1);

      await expect(
        service.updateStatus(
          tenantId,
          userId,
          HospitalUserStatus.INACTIVE,
          performedBy,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(
        mockUserRepository.setStatusWithSessionRevoke,
      ).not.toHaveBeenCalled();
    });

    it('should allow deactivating a SUPER_ADMIN when another admin exists', async () => {
      mockUserRepository.findById.mockResolvedValue({
        ...activeUser,
        userType: HospitalUserType.SUPER_ADMIN,
      });
      mockUserRepository.countActiveSuperAdmins.mockResolvedValue(2);
      mockUserRepository.setStatusWithSessionRevoke.mockResolvedValue({
        ...activeUser,
        status: HospitalUserStatus.INACTIVE,
      });

      const result = await service.updateStatus(
        tenantId,
        userId,
        HospitalUserStatus.INACTIVE,
        performedBy,
      );

      expect(result.status).toBe(HospitalUserStatus.INACTIVE);
    });
  });

  // --- SOFT DELETE TESTS --------------------------------------------
  describe('softDelete', () => {
    it('should soft delete a user (repo revokes sessions + refresh token)', async () => {
      mockUserRepository.findById.mockResolvedValue(activeUser);
      mockUserRepository.softDelete.mockResolvedValue(activeUser);

      const result = await service.softDelete(tenantId, userId, performedBy);

      expect(result.message).toBe('User deleted successfully');
      expect(mockUserRepository.softDelete).toHaveBeenCalledWith(
        userId,
        tenantId,
        performedBy,
      );
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(
        service.softDelete(tenantId, userId, performedBy),
      ).rejects.toThrow(NotFoundException);

      expect(mockUserRepository.softDelete).not.toHaveBeenCalled();
    });

    it('should block soft-deleting the last active SUPER_ADMIN', async () => {
      mockUserRepository.findById.mockResolvedValue({
        ...activeUser,
        userType: HospitalUserType.SUPER_ADMIN,
      });
      mockUserRepository.countActiveSuperAdmins.mockResolvedValue(1);

      await expect(
        service.softDelete(tenantId, userId, performedBy),
      ).rejects.toThrow(BadRequestException);

      expect(mockUserRepository.softDelete).not.toHaveBeenCalled();
    });
  });

  // --- BULK DEPARTMENT MAPPING TESTS --------------------------------
  describe('setDepartments', () => {
    const dto = { departmentIds: [1, 2] };

    it('should sync departments atomically', async () => {
      mockUserRepository.findById.mockResolvedValue(activeUser);
      mockTenantValidationService.validateReferences.mockResolvedValue(
        undefined,
      );
      mockUserRepository.syncDepartments.mockResolvedValue([
        { userId, departmentId: 1, department: { id: 1, name: 'OPD' } },
        { userId, departmentId: 2, department: { id: 2, name: 'IPD' } },
      ]);

      const result = await service.setDepartments(
        tenantId,
        userId,
        dto,
        performedBy,
      );

      expect(
        mockTenantValidationService.validateReferences,
      ).toHaveBeenCalledWith(tenantId, { departmentIds: [1, 2] });
      expect(mockUserRepository.syncDepartments).toHaveBeenCalledWith(
        userId,
        tenantId,
        [1, 2],
        performedBy,
      );
      expect(result.departments).toHaveLength(2);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(
        service.setDepartments(tenantId, userId, dto, performedBy),
      ).rejects.toThrow(NotFoundException);

      expect(mockUserRepository.syncDepartments).not.toHaveBeenCalled();
    });

    it('should propagate validation errors for cross-tenant departments', async () => {
      mockUserRepository.findById.mockResolvedValue(activeUser);
      mockTenantValidationService.validateReferences.mockRejectedValue(
        new BadRequestException('Invalid tenant references provided'),
      );

      await expect(
        service.setDepartments(tenantId, userId, dto, performedBy),
      ).rejects.toThrow(BadRequestException);

      expect(mockUserRepository.syncDepartments).not.toHaveBeenCalled();
    });
  });

  // --- BULK ROLE ASSIGNMENT TESTS -----------------------------------
  describe('setRoles', () => {
    const dto = {
      roles: [
        { hospitalRoleId: 10, isPrimary: true },
        { hospitalRoleId: 20, isPrimary: false },
      ],
    };

    it('should sync roles atomically with exactly one primary', async () => {
      mockUserRepository.findById.mockResolvedValue(activeUser);
      mockTenantValidationService.validateReferences.mockResolvedValue(
        undefined,
      );
      mockUserRepository.syncRoles.mockResolvedValue([
        {
          userId,
          hospitalRoleId: 10,
          isPrimary: true,
          hospitalRole: { roleName: { name: 'Doctor' } },
        },
        {
          userId,
          hospitalRoleId: 20,
          isPrimary: false,
          hospitalRole: { roleName: { name: 'Nurse' } },
        },
      ]);

      const result = await service.setRoles(tenantId, userId, dto, performedBy);

      expect(
        mockTenantValidationService.validateReferences,
      ).toHaveBeenCalledWith(tenantId, {
        primaryRoleId: 10,
        additionalRoleIds: [20],
      });
      expect(mockUserRepository.syncRoles).toHaveBeenCalledWith(
        userId,
        tenantId,
        dto.roles,
        performedBy,
      );
      expect(result.roles).toHaveLength(2);
    });

    it('should reject when no role is marked primary', async () => {
      mockUserRepository.findById.mockResolvedValue(activeUser);

      await expect(
        service.setRoles(
          tenantId,
          userId,
          {
            roles: [
              { hospitalRoleId: 10, isPrimary: false },
              { hospitalRoleId: 20, isPrimary: false },
            ],
          },
          performedBy,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mockUserRepository.syncRoles).not.toHaveBeenCalled();
    });

    it('should reject when more than one role is marked primary', async () => {
      mockUserRepository.findById.mockResolvedValue(activeUser);

      await expect(
        service.setRoles(
          tenantId,
          userId,
          {
            roles: [
              { hospitalRoleId: 10, isPrimary: true },
              { hospitalRoleId: 20, isPrimary: true },
            ],
          },
          performedBy,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mockUserRepository.syncRoles).not.toHaveBeenCalled();
    });

    it('should reject duplicate hospitalRoleIds', async () => {
      mockUserRepository.findById.mockResolvedValue(activeUser);

      await expect(
        service.setRoles(
          tenantId,
          userId,
          {
            roles: [
              { hospitalRoleId: 10, isPrimary: true },
              { hospitalRoleId: 10, isPrimary: false },
            ],
          },
          performedBy,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mockUserRepository.syncRoles).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(
        service.setRoles(tenantId, userId, dto, performedBy),
      ).rejects.toThrow(NotFoundException);

      expect(mockUserRepository.syncRoles).not.toHaveBeenCalled();
    });
  });

  // --- EFFECTIVE PERMISSIONS TESTS ----------------------------------
  describe('getEffectivePermissions', () => {
    it('should return combined permissions after verifying user exists', async () => {
      mockUserRepository.findById.mockResolvedValue(activeUser);
      mockUserRepository.getEffectivePermissions.mockResolvedValue([
        {
          moduleId: 1,
          featureId: 5,
          moduleCode: 'OPD',
          featureCode: 'VIEW',
          isDirect: false,
          inheritedFromRoles: ['Doctor'],
        },
      ]);

      const result = await service.getEffectivePermissions(tenantId, userId);

      expect(mockUserRepository.getEffectivePermissions).toHaveBeenCalledWith(
        userId,
        tenantId,
      );
      expect(result).toHaveLength(1);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(
        service.getEffectivePermissions(tenantId, userId),
      ).rejects.toThrow(NotFoundException);

      expect(mockUserRepository.getEffectivePermissions).not.toHaveBeenCalled();
    });
  });
});
