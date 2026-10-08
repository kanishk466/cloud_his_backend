import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PackagesService } from '../services/packages.service';
import { PackagesRepository } from '../repositories/packages.repository';

const mockRepo = {
  findServiceByCode: jest.fn(),
  createFull: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  updateWithSkuSync: jest.fn(),
  softDelete: jest.fn(),
  replaceComponents: jest.fn(),
  replaceConsults: jest.fn(),
  replaceExclusions: jest.fn(),
  findRoomType: jest.fn(),
  findServicesByIds: jest.fn(),
  findDepartment: jest.fn(),
  findDoctor: jest.fn(),
  findProceduresCategory: jest.fn(),
};

describe('PackagesService', () => {
  let service: PackagesService;

  const tenantId = 'tenant-uuid';

  const dto = {
    name: 'Executive Health Checkup',
    code: 'PKG-EHC',
    basePrice: 2999,
    validityDays: 30,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PackagesService,
        { provide: PackagesRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<PackagesService>(PackagesService);
    jest.clearAllMocks();

    mockRepo.findProceduresCategory.mockResolvedValue({ id: 'cat-proc' });
  });

  // ─── AUTO-SKU CREATE ──────────────────────────────────────────────────
  describe('create', () => {
    it('creates package with auto-SKU in one transaction', async () => {
      mockRepo.findServiceByCode.mockResolvedValue(null);
      mockRepo.createFull.mockResolvedValue({
        id: 'pkg-1',
        code: 'PKG-EHC',
        serviceSku: { serviceCode: 'PKG-EHC', itemType: 'PACKAGE' },
      });

      const result = await service.create(tenantId, dto);

      expect(mockRepo.createFull).toHaveBeenCalledWith(
        tenantId,
        dto,
        'cat-proc',
      );
      expect(result.serviceSku.itemType).toBe('PACKAGE');
    });

    it('rejects when a package already owns the code (409)', async () => {
      mockRepo.findServiceByCode.mockResolvedValue({
        id: 'svc-1',
        packageMaster: { id: 'pkg-existing' },
      });

      await expect(service.create(tenantId, dto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockRepo.createFull).not.toHaveBeenCalled();
    });

    it('rejects roomType from another tenant (404)', async () => {
      mockRepo.findServiceByCode.mockResolvedValue(null);
      mockRepo.findRoomType.mockResolvedValue(null);

      await expect(
        service.create(tenantId, { ...dto, roomTypeId: 'rt-x' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('blocks nesting a package inside components (400)', async () => {
      mockRepo.findServiceByCode.mockResolvedValue(null);
      mockRepo.findServicesByIds.mockResolvedValue([
        { id: 'svc-other', itemType: 'PACKAGE', serviceName: 'Other Package' },
      ]);

      await expect(
        service.create(tenantId, {
          ...dto,
          components: [{ serviceId: 'svc-other' }],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── UPDATE (SKU sync) ────────────────────────────────────────────────
  describe('update', () => {
    it('syncs basePrice/name to the SKU', async () => {
      mockRepo.findById.mockResolvedValue({ id: 'pkg-1', serviceId: 'svc-1' });
      mockRepo.updateWithSkuSync.mockResolvedValue({ id: 'pkg-1' });

      await service.update(tenantId, 'pkg-1', {
        basePrice: 3499,
        name: 'EHC Plus',
      });

      expect(mockRepo.updateWithSkuSync).toHaveBeenCalledWith(
        tenantId,
        'pkg-1',
        { basePrice: 3499, name: 'EHC Plus' },
        'svc-1',
      );
    });
  });

  // ─── DELETE ───────────────────────────────────────────────────────────
  describe('remove', () => {
    it('soft-deletes package and deactivates SKU', async () => {
      mockRepo.findById.mockResolvedValue({ id: 'pkg-1', serviceId: 'svc-1' });
      mockRepo.softDelete.mockResolvedValue({});

      const result = await service.remove(tenantId, 'pkg-1');

      expect(mockRepo.softDelete).toHaveBeenCalledWith(
        tenantId,
        'pkg-1',
        'svc-1',
      );
      expect(result.message).toContain('SKU deactivated');
    });
  });

  // ─── SYNC COMPONENTS ──────────────────────────────────────────────────
  describe('syncComponents', () => {
    it('validates services then replaces atomically', async () => {
      mockRepo.findById.mockResolvedValue({ id: 'pkg-1' });
      mockRepo.findServicesByIds.mockResolvedValue([
        { id: 'svc-cbc', itemType: 'BOTH', serviceName: 'CBC' },
      ]);
      mockRepo.replaceComponents.mockResolvedValue([{ id: 'comp-1' }]);

      const result = await service.syncComponents(tenantId, 'pkg-1', {
        components: [{ serviceId: 'svc-cbc', quantity: 2 }],
      });

      expect(result.components).toHaveLength(1);
    });
  });
});
