import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { BulkImportService } from '../services/bulk-import.service';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

const mockPrisma = {
  serviceCategoryMaster: { findMany: jest.fn(), count: jest.fn() },
  serviceSubCategory: { findMany: jest.fn() },
  serviceMaster: {
    findMany: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn((cb: any) => cb(mockPrisma)),
};

const DIAG = { id: 'cat-diag', code: 'DIAG' };
const HEM = { id: 'sub-hem', code: 'HEM', categoryId: 'cat-diag' };
const BIO = { id: 'sub-bio', code: 'BIO', categoryId: 'cat-diag' };

function csvBuffer(content: string): Buffer {
  return Buffer.from(content, 'utf-8');
}

describe('BulkImportService', () => {
  let service: BulkImportService;

  const tenantId = 'tenant-uuid';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BulkImportService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<BulkImportService>(BulkImportService);

    jest.clearAllMocks();
    mockPrisma.serviceCategoryMaster.findMany.mockResolvedValue([DIAG]);
    mockPrisma.serviceSubCategory.findMany.mockResolvedValue([HEM, BIO]);
    mockPrisma.serviceMaster.findMany.mockResolvedValue([]);
    mockPrisma.serviceMaster.createMany.mockImplementation(({ data }) =>
      Promise.resolve({ count: data.length }),
    );
  });

  it('imports valid CSV rows with defaults applied', async () => {
    const csv = [
      'serviceCode,serviceName,categoryCode,subCategoryCode,baseRate',
      'LAB-CBC,Complete Blood Count,DIAG,HEM,250',
      'LAB-BSF,Blood Sugar Fasting,DIAG,BIO,120',
    ].join('\n');

    const result = await service.importServicesFromFile(
      tenantId,
      csvBuffer(csv),
      'csv',
    );

    expect(result).toMatchObject({
      totalRows: 2,
      imported: 2,
      updated: 0,
      skipped: 0,
      errors: [],
    });
    expect(mockPrisma.serviceMaster.createMany).toHaveBeenCalledTimes(1);
    const inserted = mockPrisma.serviceMaster.createMany.mock.calls[0][0].data;
    expect(inserted[0]).toMatchObject({
      tenantId,
      serviceCode: 'LAB-CBC',
      serviceName: 'Complete Blood Count',
      categoryId: 'cat-diag',
      subCategoryId: 'sub-hem',
      baseRate: 250,
      itemType: 'BOTH', // default
      uom: 'Per Unit', // default
      rateEditable: false, // default
      discountable: true, // default
    });
  });

  it('skips serviceCodes that already exist in the tenant', async () => {
    mockPrisma.serviceMaster.findMany.mockResolvedValue([
      { id: 'existing-1', serviceCode: 'LAB-CBC' },
    ]);

    const csv = [
      'serviceCode,serviceName,categoryCode,baseRate',
      'LAB-CBC,Complete Blood Count,DIAG,250',
      'LAB-BSF,Blood Sugar Fasting,DIAG,120',
    ].join('\n');

    const result = await service.importServicesFromFile(
      tenantId,
      csvBuffer(csv),
      'csv',
    );

    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.errors).toEqual([]);
  });

  it('updates existing serviceCodes when duplicateStrategy=update', async () => {
    mockPrisma.serviceMaster.findMany.mockResolvedValue([
      { id: 'existing-1', serviceCode: 'LAB-CBC' },
    ]);
    mockPrisma.serviceMaster.update.mockResolvedValue({});

    const csv = [
      'serviceCode,serviceName,categoryCode,baseRate',
      'LAB-CBC,CBC Updated Name,DIAG,300',
    ].join('\n');

    const result = await service.importServicesFromFile(
      tenantId,
      csvBuffer(csv),
      'csv',
      { duplicateStrategy: 'update' },
    );

    expect(result.updated).toBe(1);
    expect(result.imported).toBe(0);
    expect(mockPrisma.serviceMaster.update).toHaveBeenCalledWith({
      where: { id: 'existing-1' },
      data: expect.objectContaining({
        serviceName: 'CBC Updated Name',
        baseRate: 300,
      }),
    });
  });

  it('collects row-level errors without aborting the whole file', async () => {
    const csv = [
      'serviceCode,serviceName,categoryCode,subCategoryCode,baseRate',
      ',No Code Row,DIAG,,100', // row 2: missing serviceCode
      'LAB-X,Unknown Cat,UNKNOWN,,100', // row 3: unknown category
      'LAB-Y,Bad Rate,DIAG,,abc', // row 4: invalid baseRate
      'LAB-CBC,Valid Row,DIAG,HEM,250', // row 5: valid
      'LAB-CBC,Duplicate In File,DIAG,HEM,300', // row 6: intra-file duplicate
    ].join('\n');

    const result = await service.importServicesFromFile(
      tenantId,
      csvBuffer(csv),
      'csv',
    );

    expect(result.imported).toBe(1);
    expect(result.errors).toHaveLength(4);
    expect(result.errors.map((e) => e.row)).toEqual([2, 3, 4, 6]);
    expect(result.errors[1].reason).toContain("Unknown categoryCode 'UNKNOWN'");
  });

  it('rejects sub-category from another category', async () => {
    mockPrisma.serviceSubCategory.findMany.mockResolvedValue([
      { id: 'sub-x', code: 'XRY', categoryId: 'cat-rad' }, // belongs to RAD
    ]);

    const csv = [
      'serviceCode,serviceName,categoryCode,subCategoryCode,baseRate',
      'LAB-1,Test,DIAG,XRY,100',
    ].join('\n');

    const result = await service.importServicesFromFile(
      tenantId,
      csvBuffer(csv),
      'csv',
    );

    expect(result.imported).toBe(0);
    expect(result.errors[0].reason).toContain('does not belong to category');
  });

  it('rejects invalid enum/boolean/age values with clear reasons', async () => {
    const csv = [
      'serviceCode,serviceName,categoryCode,baseRate,itemType,rateEditable,minAgeYears,maxAgeYears',
      'LAB-1,Bad Type,DIAG,100,WRONG,,,',
      'LAB-2,Bad Bool,DIAG,100,,maybe,,',
      'LAB-3,Bad Age Range,DIAG,100,,,10,5',
    ].join('\n');

    const result = await service.importServicesFromFile(
      tenantId,
      csvBuffer(csv),
      'csv',
    );

    expect(result.imported).toBe(0);
    expect(result.errors.map((e) => e.reason)).toEqual([
      "Invalid itemType 'WRONG'",
      "Invalid rateEditable 'maybe' (use true/false)",
      'minAgeYears cannot be greater than maxAgeYears',
    ]);
  });

  it('throws BadRequestException for an empty file', async () => {
    await expect(
      service.importServicesFromFile(
        tenantId,
        csvBuffer('serviceCode,serviceName,categoryCode,baseRate'),
        'csv',
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
