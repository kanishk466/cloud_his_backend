import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { HospitalRoleService } from '../services/hospital-role.service';
import { HospitalRoleRepository } from '../repositories/hospital-role.repository';
import { EntitlementRepository } from '../repositories/entitlement.repository';

// Mock repositories
const mockRoleRepository = {
  createFromExistingMaster: jest.fn(),
  createWithCustomMasterRoleName: jest.fn(),
  getMasterCatalog: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  toggle: jest.fn(),
  setPermissions: jest.fn(),
  getPermissions: jest.fn(),
};

const mockEntitlementRepository = {
  getEntitledModuleIds: jest.fn(),
  getModulesWithFeaturesForUser: jest.fn(),
};

describe('HospitalRoleService', () => {
  let service: HospitalRoleService;

  const tenantId = 'tenant-uuid';
  const performedBy = 'admin-uuid';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HospitalRoleService,
        { provide: HospitalRoleRepository, useValue: mockRoleRepository },
        { provide: EntitlementRepository, useValue: mockEntitlementRepository },
      ],
    }).compile();

    service = module.get<HospitalRoleService>(HospitalRoleService);

    jest.clearAllMocks();
  });

  // --- CREATE (DUPLICATE ROLE CHECK) TESTS --------------------------
  describe('create', () => {
    it('should create role from existing master and record createdBy', async () => {
      mockRoleRepository.createFromExistingMaster.mockResolvedValue({
        id: 1,
        roleNameId: 3,
      });

      const result = await service.create(
        tenantId,
        { roleNameId: 3 },
        performedBy,
      );

      expect(mockRoleRepository.createFromExistingMaster).toHaveBeenCalledWith(
        tenantId,
        {
          roleNameId: 3,
          description: undefined,
          cloneFromRoleId: undefined,
          performedBy,
        },
      );
      expect(result.id).toBe(1);
    });

    it('should throw ConflictException when roleNameId is already used in this tenant', async () => {
      mockRoleRepository.createFromExistingMaster.mockRejectedValue(
        new Error('ROLE_ALREADY_EXISTS_IN_HOSPITAL'),
      );

      await expect(
        service.create(tenantId, { roleNameId: 3 }, performedBy),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when custom role name already exists in this tenant', async () => {
      mockRoleRepository.createWithCustomMasterRoleName.mockRejectedValue(
        new Error('ROLE_ALREADY_EXISTS_IN_HOSPITAL'),
      );

      await expect(
        service.create(tenantId, { roleName: 'Accountant' }, performedBy),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when master role does not exist', async () => {
      mockRoleRepository.createFromExistingMaster.mockRejectedValue(
        new Error('MASTER_ROLE_NOT_FOUND'),
      );

      await expect(
        service.create(tenantId, { roleNameId: 999 }, performedBy),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject when neither roleNameId nor roleName is provided', async () => {
      await expect(service.create(tenantId, {}, performedBy)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // --- ROLE PERMISSION SYNC TESTS -----------------------------------
  describe('setPermissions', () => {
    const dto = {
      moduleFeatures: [
        { moduleId: 1, featureId: 5 },
        { moduleId: 2, featureId: 7 },
      ],
    };

    it('should sync permissions in a transaction and record updatedBy', async () => {
      mockEntitlementRepository.getEntitledModuleIds.mockResolvedValue([1, 2]);
      mockRoleRepository.setPermissions.mockResolvedValue({ id: 10 });

      const result = await service.setPermissions(
        tenantId,
        10,
        dto,
        performedBy,
      );

      expect(mockRoleRepository.setPermissions).toHaveBeenCalledWith(
        10,
        tenantId,
        dto.moduleFeatures,
        performedBy,
      );
      expect(result).toEqual({ id: 10 });
    });

    it('should reject modules not in the hospital package', async () => {
      mockEntitlementRepository.getEntitledModuleIds.mockResolvedValue([1]);

      await expect(
        service.setPermissions(tenantId, 10, dto, performedBy),
      ).rejects.toThrow(BadRequestException);

      expect(mockRoleRepository.setPermissions).not.toHaveBeenCalled();
    });

    it('should reject when hospital has no active package', async () => {
      mockEntitlementRepository.getEntitledModuleIds.mockResolvedValue([]);

      await expect(
        service.setPermissions(tenantId, 10, dto, performedBy),
      ).rejects.toThrow(BadRequestException);

      expect(mockRoleRepository.setPermissions).not.toHaveBeenCalled();
    });

    it('should map ROLE_NOT_FOUND to NotFoundException', async () => {
      mockEntitlementRepository.getEntitledModuleIds.mockResolvedValue([1, 2]);
      mockRoleRepository.setPermissions.mockRejectedValue(
        new Error('ROLE_NOT_FOUND'),
      );

      await expect(
        service.setPermissions(tenantId, 10, dto, performedBy),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // --- UPDATE / TOGGLE AUDIT TESTS ----------------------------------
  describe('update & toggle', () => {
    it('should record updatedBy on update', async () => {
      mockRoleRepository.update.mockResolvedValue({ id: 10 });

      await service.update(
        tenantId,
        10,
        { description: 'Updated' },
        performedBy,
      );

      expect(mockRoleRepository.update).toHaveBeenCalledWith(
        10,
        tenantId,
        { description: 'Updated' },
        performedBy,
      );
    });

    it('should record updatedBy on toggle', async () => {
      mockRoleRepository.toggle.mockResolvedValue({ id: 10, isActive: false });

      await service.toggle(tenantId, 10, false, performedBy);

      expect(mockRoleRepository.toggle).toHaveBeenCalledWith(
        10,
        tenantId,
        false,
        performedBy,
      );
    });

    it('should map ROLE_NOT_FOUND on update to NotFoundException', async () => {
      mockRoleRepository.update.mockRejectedValue(new Error('ROLE_NOT_FOUND'));

      await expect(
        service.update(tenantId, 10, { description: 'x' }, performedBy),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
