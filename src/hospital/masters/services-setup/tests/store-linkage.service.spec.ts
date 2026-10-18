import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { StoreLinkageService } from '../services/store-linkage.service';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

const mockPrisma = {
  serviceMaster: { findFirst: jest.fn(), findMany: jest.fn() },
};

describe('StoreLinkageService', () => {
  let service: StoreLinkageService;

  const tenantId = 'tenant-uuid';
  const serviceId = 'service-uuid';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoreLinkageService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<StoreLinkageService>(StoreLinkageService);
    jest.clearAllMocks();
  });

  it('returns the storeType from the service category', async () => {
    mockPrisma.serviceMaster.findFirst.mockResolvedValue({
      id: serviceId,
      serviceCode: 'PHA-TAB-001',
      categoryRel: { storeType: 'MEDICAL' },
    });

    const result = await service.getStoreTypeForService(tenantId, serviceId);

    expect(result).toEqual({
      serviceId,
      serviceCode: 'PHA-TAB-001',
      storeType: 'MEDICAL',
    });
  });

  it('falls back to NONE when the service has no category', async () => {
    mockPrisma.serviceMaster.findFirst.mockResolvedValue({
      id: serviceId,
      serviceCode: 'SVC-0001',
      categoryRel: null,
    });

    const result = await service.getStoreTypeForService(tenantId, serviceId);

    expect(result.storeType).toBe('NONE');
  });

  it('throws NotFoundException for unknown service', async () => {
    mockPrisma.serviceMaster.findFirst.mockResolvedValue(null);

    await expect(
      service.getStoreTypeForService(tenantId, serviceId),
    ).rejects.toThrow(NotFoundException);
  });

  it('queries active services by store type with tenant scoping', async () => {
    mockPrisma.serviceMaster.findMany.mockResolvedValue([
      { id: 's1', serviceCode: 'PHA-TAB-001' },
    ]);

    const result = await service.getServicesByStoreType(tenantId, 'MEDICAL');

    expect(mockPrisma.serviceMaster.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId,
          deletedAt: null,
          isActive: true,
          categoryRel: { is: { storeType: 'MEDICAL', deletedAt: null } },
        }),
      }),
    );
    expect(result).toHaveLength(1);
  });
});
