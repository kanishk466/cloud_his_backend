import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ServiceItemsService } from '../services/service-items.service';
import { ServiceItemsRepository } from '../repositories/service-items.repository';
import { ServiceCategoriesRepository } from '../repositories/service-categories.repository';
import { ServiceSubCategoriesRepository } from '../repositories/service-sub-categories.repository';

const mockItemsRepo = {
  generateServiceCode: jest.fn(),
  findByCode: jest.fn(),
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
};

const mockCategoriesRepo = {
  findById: jest.fn(),
};

const mockSubCategoriesRepo = {
  findById: jest.fn(),
};

describe('ServiceItemsService', () => {
  let service: ServiceItemsService;

  const tenantId = 'tenant-uuid';
  const categoryId = 'category-uuid';
  const subCategoryId = 'sub-category-uuid';

  const category = {
    id: categoryId,
    tenantId,
    name: 'Diagnostics',
    code: 'DIAG',
  };
  const subCategory = {
    id: subCategoryId,
    tenantId,
    categoryId,
    name: 'Biochemistry',
    code: 'BIO',
  };
  const item = {
    id: 'item-uuid',
    tenantId,
    serviceCode: 'SVC-0001',
    serviceName: 'Complete Blood Count (CBC)',
    baseRate: 250,
    categoryId,
    subCategoryId,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceItemsService,
        { provide: ServiceItemsRepository, useValue: mockItemsRepo },
        { provide: ServiceCategoriesRepository, useValue: mockCategoriesRepo },
        {
          provide: ServiceSubCategoriesRepository,
          useValue: mockSubCategoriesRepo,
        },
      ],
    }).compile();

    service = module.get<ServiceItemsService>(ServiceItemsService);

    jest.clearAllMocks();
  });

  // --- CREATE TESTS -------------------------------------------------
  describe('create', () => {
    it('should auto-generate serviceCode when omitted', async () => {
      mockItemsRepo.generateServiceCode.mockResolvedValue('SVC-0007');
      mockItemsRepo.create.mockImplementation((_, data) =>
        Promise.resolve({ ...item, ...data }),
      );

      const result = await service.create(tenantId, {
        serviceName: 'CBC',
        baseRate: 250,
      } as any);

      expect(mockItemsRepo.generateServiceCode).toHaveBeenCalledWith(tenantId);
      expect(mockItemsRepo.create).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          serviceCode: 'SVC-0007',
          categoryId: undefined,
          subCategoryId: undefined,
        }),
      );
      expect(result.serviceCode).toBe('SVC-0007');
    });

    it('should accept a provided unique serviceCode', async () => {
      mockItemsRepo.findByCode.mockResolvedValue(null);
      mockItemsRepo.create.mockImplementation((_, data) =>
        Promise.resolve({ ...item, ...data }),
      );

      await service.create(tenantId, {
        serviceCode: 'LAB-CBC',
        serviceName: 'CBC',
        baseRate: 250,
      } as any);

      expect(mockItemsRepo.findByCode).toHaveBeenCalledWith(
        tenantId,
        'LAB-CBC',
      );
      expect(mockItemsRepo.generateServiceCode).not.toHaveBeenCalled();
    });

    it('should throw ConflictException on duplicate serviceCode', async () => {
      mockItemsRepo.findByCode.mockResolvedValue(item);

      await expect(
        service.create(tenantId, {
          serviceCode: 'SVC-0001',
          serviceName: 'CBC',
          baseRate: 250,
        } as any),
      ).rejects.toThrow(ConflictException);

      expect(mockItemsRepo.create).not.toHaveBeenCalled();
    });

    it('should auto-fill categoryId from the sub-category', async () => {
      mockSubCategoriesRepo.findById.mockResolvedValue(subCategory);
      mockItemsRepo.create.mockImplementation((_, data) =>
        Promise.resolve({ ...item, ...data }),
      );

      await service.create(tenantId, {
        serviceName: 'CBC',
        baseRate: 250,
        subCategoryId,
      } as any);

      expect(mockCategoriesRepo.findById).not.toHaveBeenCalled();
      expect(mockItemsRepo.create).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ categoryId, subCategoryId }),
      );
    });

    it('should pass when category and sub-category are consistent', async () => {
      mockCategoriesRepo.findById.mockResolvedValue(category);
      mockSubCategoriesRepo.findById.mockResolvedValue(subCategory);
      mockItemsRepo.create.mockImplementation((_, data) =>
        Promise.resolve({ ...item, ...data }),
      );

      await service.create(tenantId, {
        serviceName: 'CBC',
        baseRate: 250,
        categoryId,
        subCategoryId,
      } as any);

      expect(mockItemsRepo.create).toHaveBeenCalled();
    });

    it('should reject sub-category that belongs to another category', async () => {
      mockCategoriesRepo.findById.mockResolvedValue(category);
      mockSubCategoriesRepo.findById.mockResolvedValue({
        ...subCategory,
        categoryId: 'other-category-uuid',
      });

      await expect(
        service.create(tenantId, {
          serviceName: 'CBC',
          baseRate: 250,
          categoryId,
          subCategoryId,
        } as any),
      ).rejects.toThrow(BadRequestException);

      expect(mockItemsRepo.create).not.toHaveBeenCalled();
    });

    it('should reject a category from another tenant (404)', async () => {
      mockCategoriesRepo.findById.mockResolvedValue(null);

      await expect(
        service.create(tenantId, {
          serviceName: 'CBC',
          baseRate: 250,
          categoryId,
        } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject minAgeYears > maxAgeYears', async () => {
      await expect(
        service.create(tenantId, {
          serviceName: 'Phototherapy',
          baseRate: 500,
          minAgeYears: 5,
          maxAgeYears: 1,
        } as any),
      ).rejects.toThrow(BadRequestException);

      expect(mockItemsRepo.create).not.toHaveBeenCalled();
    });
  });

  // --- UPDATE TESTS ---------------------------------------------------
  describe('update', () => {
    it('should update after existence check', async () => {
      mockItemsRepo.findById.mockResolvedValue(item);
      mockItemsRepo.update.mockImplementation((_, __, data) =>
        Promise.resolve({ ...item, ...data }),
      );

      const result = await service.update(tenantId, item.id, {
        serviceName: 'CBC (Updated)',
      });

      expect(result.serviceName).toBe('CBC (Updated)');
    });

    it('should throw NotFoundException when missing', async () => {
      mockItemsRepo.findById.mockResolvedValue(null);

      await expect(
        service.update(tenantId, item.id, { serviceName: 'X' }),
      ).rejects.toThrow(NotFoundException);

      expect(mockItemsRepo.update).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when changing to a taken code', async () => {
      mockItemsRepo.findById.mockResolvedValue(item);
      mockItemsRepo.findByCode.mockResolvedValue({ id: 'another-item' });

      await expect(
        service.update(tenantId, item.id, { serviceCode: 'TAKEN' }),
      ).rejects.toThrow(ConflictException);

      expect(mockItemsRepo.update).not.toHaveBeenCalled();
    });

    it('should validate merged age range on update', async () => {
      mockItemsRepo.findById.mockResolvedValue({ ...item, maxAgeYears: 10 });

      await expect(
        service.update(tenantId, item.id, { minAgeYears: 12 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should re-validate hierarchy when subCategoryId changes', async () => {
      mockItemsRepo.findById.mockResolvedValue(item);
      mockCategoriesRepo.findById.mockResolvedValue(category);
      mockSubCategoriesRepo.findById.mockResolvedValue({
        ...subCategory,
        categoryId: 'other-category-uuid',
      });

      await expect(
        service.update(tenantId, item.id, { subCategoryId }),
      ).rejects.toThrow(BadRequestException);

      expect(mockItemsRepo.update).not.toHaveBeenCalled();
    });
  });

  // --- REMOVE TESTS ---------------------------------------------------
  describe('remove', () => {
    it('should soft delete', async () => {
      mockItemsRepo.findById.mockResolvedValue(item);
      mockItemsRepo.softDelete.mockResolvedValue(item);

      const result = await service.remove(tenantId, item.id);

      expect(result.message).toBe('Service deleted successfully');
      expect(mockItemsRepo.softDelete).toHaveBeenCalledWith(tenantId, item.id);
    });

    it('should throw NotFoundException when missing', async () => {
      mockItemsRepo.findById.mockResolvedValue(null);

      await expect(service.remove(tenantId, item.id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // --- LIST TESTS -----------------------------------------------------
  describe('findAll', () => {
    it('should pass filters to the repository', async () => {
      mockItemsRepo.findAll.mockResolvedValue([item]);

      const filters = { search: 'cbc', itemType: 'OPD', isActive: true };
      const result = await service.findAll(tenantId, filters as any);

      expect(mockItemsRepo.findAll).toHaveBeenCalledWith(tenantId, filters);
      expect(result).toHaveLength(1);
    });
  });
});
