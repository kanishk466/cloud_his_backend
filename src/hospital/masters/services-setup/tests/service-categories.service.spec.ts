import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ServiceCategoriesService } from '../services/service-categories.service';
import { ServiceCategoriesRepository } from '../repositories/service-categories.repository';

const mockRepository = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
  countActiveSubCategories: jest.fn(),
  countActiveServices: jest.fn(),
};

const p2002 = new Prisma.PrismaClientKnownRequestError('Unique', {
  code: 'P2002',
  clientVersion: '5.22.0',
});

describe('ServiceCategoriesService', () => {
  let service: ServiceCategoriesService;

  const tenantId = 'tenant-uuid';
  const categoryId = 'category-uuid';
  const category = {
    id: categoryId,
    tenantId,
    name: 'Diagnostics / Lab',
    code: 'DIAG',
    storeType: 'NONE',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceCategoriesService,
        { provide: ServiceCategoriesRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<ServiceCategoriesService>(ServiceCategoriesService);

    jest.clearAllMocks();
  });

  // --- CREATE TESTS -------------------------------------------------
  describe('create', () => {
    const dto = { name: 'Diagnostics / Lab', code: 'DIAG' };

    it('should create a category', async () => {
      mockRepository.create.mockResolvedValue(category);

      const result = await service.create(tenantId, dto as any);

      expect(mockRepository.create).toHaveBeenCalledWith(tenantId, dto);
      expect(result.code).toBe('DIAG');
    });

    it('should throw ConflictException on duplicate code (P2002)', async () => {
      mockRepository.create.mockRejectedValue(p2002);

      await expect(service.create(tenantId, dto as any)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // --- FIND ONE TESTS -----------------------------------------------
  describe('findOne', () => {
    it('should return the category', async () => {
      mockRepository.findById.mockResolvedValue(category);

      const result = await service.findOne(tenantId, categoryId);

      expect(result.id).toBe(categoryId);
    });

    it('should throw NotFoundException when missing', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.findOne(tenantId, categoryId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // --- UPDATE TESTS ---------------------------------------------------
  describe('update', () => {
    it('should update after existence check', async () => {
      mockRepository.findById.mockResolvedValue(category);
      mockRepository.update.mockResolvedValue({ ...category, name: 'Labs' });

      const result = await service.update(tenantId, categoryId, {
        name: 'Labs',
      });

      expect(result.name).toBe('Labs');
      expect(mockRepository.update).toHaveBeenCalledWith(tenantId, categoryId, {
        name: 'Labs',
      });
    });

    it('should throw NotFoundException when missing', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.update(tenantId, categoryId, { name: 'Labs' }),
      ).rejects.toThrow(NotFoundException);

      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should throw ConflictException on duplicate code (P2002)', async () => {
      mockRepository.findById.mockResolvedValue(category);
      mockRepository.update.mockRejectedValue(p2002);

      await expect(
        service.update(tenantId, categoryId, { code: 'DIAG2' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // --- REMOVE TESTS ---------------------------------------------------
  describe('remove', () => {
    it('should soft delete an unlinked category', async () => {
      mockRepository.findById.mockResolvedValue(category);
      mockRepository.countActiveSubCategories.mockResolvedValue(0);
      mockRepository.countActiveServices.mockResolvedValue(0);
      mockRepository.softDelete.mockResolvedValue(category);

      const result = await service.remove(tenantId, categoryId);

      expect(result.message).toBe('Service category deleted successfully');
      expect(mockRepository.softDelete).toHaveBeenCalledWith(
        tenantId,
        categoryId,
      );
    });

    it('should block delete while sub-categories are linked', async () => {
      mockRepository.findById.mockResolvedValue(category);
      mockRepository.countActiveSubCategories.mockResolvedValue(2);
      mockRepository.countActiveServices.mockResolvedValue(0);

      await expect(service.remove(tenantId, categoryId)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockRepository.softDelete).not.toHaveBeenCalled();
    });

    it('should block delete while services are linked', async () => {
      mockRepository.findById.mockResolvedValue(category);
      mockRepository.countActiveSubCategories.mockResolvedValue(0);
      mockRepository.countActiveServices.mockResolvedValue(5);

      await expect(service.remove(tenantId, categoryId)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockRepository.softDelete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when missing', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.remove(tenantId, categoryId)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockRepository.softDelete).not.toHaveBeenCalled();
    });
  });
});
