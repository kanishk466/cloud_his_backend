import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { LabSignoffAuthoritiesService } from '../services/lab-signoff-authorities.service';
import { LabSignoffAuthoritiesRepository } from '../repositories/lab-signoff-authorities.repository';

const mockRepo = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  findForPermission: jest.fn(),
  findExact: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
  findUser: jest.fn(),
  findLabDepartment: jest.fn(),
};

describe('LabSignoffAuthoritiesService', () => {
  let service: LabSignoffAuthoritiesService;

  const tenantId = 'tenant-uuid';
  const userId = 'user-uuid';
  const deptId = 'dept-uuid';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LabSignoffAuthoritiesService,
        { provide: LabSignoffAuthoritiesRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<LabSignoffAuthoritiesService>(
      LabSignoffAuthoritiesService,
    );
    jest.clearAllMocks();
  });

  // ─── CREATE ────────────────────────────────────────────────────────────
  describe('create', () => {
    const dto = {
      hospitalUserId: userId,
      designationText: 'Consultant Pathologist',
    };

    beforeEach(() => {
      mockRepo.findUser.mockResolvedValue({ id: userId });
      mockRepo.findExact.mockResolvedValue(null);
    });

    it('creates a global (null-dept) authority', async () => {
      mockRepo.create.mockResolvedValue({ id: 'sa-1' });

      await service.create(tenantId, dto);

      expect(mockRepo.create).toHaveBeenCalled();
    });

    it('blocks duplicate GLOBAL authority (NULL-dept guard)', async () => {
      mockRepo.findExact.mockResolvedValue({ id: 'existing' });

      await expect(service.create(tenantId, dto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('blocks duplicate dept-specific authority', async () => {
      mockRepo.findLabDepartment.mockResolvedValue({ id: deptId });
      mockRepo.findExact.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create(tenantId, { ...dto, labDepartmentId: deptId }),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects unknown user (404)', async () => {
      mockRepo.findUser.mockResolvedValue(null);

      await expect(service.create(tenantId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── VERIFY PERMISSION ────────────────────────────────────────────────
  describe('verifyPermission', () => {
    const pathologist = {
      designationText: 'Consultant Pathologist (MD)',
      medicalRegNo: 'MCI-12345',
      canVerify: true,
      canApproveLock: true,
    };

    it('denies when no authority exists', async () => {
      mockRepo.findForPermission.mockResolvedValue(null);

      const result = await service.verifyPermission(tenantId, {
        hospitalUserId: userId,
        labDepartmentId: deptId,
        action: 'VERIFY',
      });

      expect(result.isAuthorized).toBe(false);
      expect(result.reason).toContain('No sign-off authority');
    });

    it('allows VERIFY when canVerify is true', async () => {
      mockRepo.findForPermission.mockResolvedValue(pathologist);

      const result = await service.verifyPermission(tenantId, {
        hospitalUserId: userId,
        labDepartmentId: deptId,
        action: 'VERIFY',
      });

      expect(result).toMatchObject({
        isAuthorized: true,
        designationText: 'Consultant Pathologist (MD)',
        medicalRegNo: 'MCI-12345',
      });
    });

    it('denies APPROVE_LOCK for a verify-only user', async () => {
      mockRepo.findForPermission.mockResolvedValue({
        ...pathologist,
        canApproveLock: false,
      });

      const result = await service.verifyPermission(tenantId, {
        hospitalUserId: userId,
        labDepartmentId: deptId,
        action: 'APPROVE_LOCK',
      });

      expect(result.isAuthorized).toBe(false);
      expect(result.reason).toContain('approve/lock');
    });

    it('allows APPROVE_LOCK for a senior pathologist', async () => {
      mockRepo.findForPermission.mockResolvedValue(pathologist);

      const result = await service.verifyPermission(tenantId, {
        hospitalUserId: userId,
        labDepartmentId: deptId,
        action: 'APPROVE_LOCK',
      });

      expect(result.isAuthorized).toBe(true);
    });
  });
});
