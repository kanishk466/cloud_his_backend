import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { InvoiceBuilderService } from '../services/invoice-builder.service';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

const mockPrisma = {
  opdBill: { findFirst: jest.fn() },
};

describe('InvoiceBuilderService', () => {
  let service: InvoiceBuilderService;

  const tenantId = 'tenant-uuid';
  const billId = 'bill-uuid';

  const diagCategory = {
    id: 'cat-diag',
    name: 'Diagnostics / Lab',
    code: 'DIAG',
    sortOrder: 1,
  };
  const consCategory = {
    id: 'cat-cons',
    name: 'Consultations',
    code: 'CONS',
    sortOrder: 3,
  };

  const bill = {
    id: billId,
    billNo: 'BILL-20261007-0001',
    billedAt: new Date('2026-10-07T10:00:00Z'),
    paymentStatus: 'PENDING',
    billStatus: 'GENERATED',
    discountReason: null,
    subtotal: 820,
    discountAmount: 0,
    discountPercent: 0,
    taxAmount: 0,
    totalAmount: 820,
    paidAmount: 0,
    dueAmount: 820,
    patient: {
      id: 'p1',
      uhid: 'PT-0001',
      firstName: 'Ramesh',
      lastName: 'Kumar',
      mobile: '9876543210',
      gender: 'MALE',
      dateOfBirth: null,
    },
    appointment: { id: 'a1', appointmentNo: 'APT-001' },
    payments: [],
    items: [
      // Item added FIRST but belongs to CONS (sortOrder 3) — must come after DIAG in output
      {
        id: 'i3',
        itemName: 'OPD Consultation',
        quantity: 1,
        unitPrice: 500,
        totalAmount: 500,
        createdAt: new Date('2026-10-07T10:00:00Z'),
        service: {
          subCategoryRel: {
            id: 'sub-opd',
            name: 'OPD Consultation',
            displayName: null,
            printOrder: 1,
            categoryRel: consCategory,
          },
          categoryRel: consCategory,
        },
      },
      // Hematology (printOrder 2) added before Biochemistry (printOrder 1) — sort must fix order
      {
        id: 'i2',
        itemName: 'CBC',
        quantity: 1,
        unitPrice: 200,
        totalAmount: 200,
        createdAt: new Date('2026-10-07T10:00:01Z'),
        service: {
          subCategoryRel: {
            id: 'sub-hem',
            name: 'Hematology',
            displayName: 'Hematology Lab',
            printOrder: 2,
            categoryRel: diagCategory,
          },
          categoryRel: diagCategory,
        },
      },
      {
        id: 'i1',
        itemName: 'Blood Sugar Fasting',
        quantity: 1,
        unitPrice: 120,
        totalAmount: 120,
        createdAt: new Date('2026-10-07T10:00:02Z'),
        service: {
          subCategoryRel: {
            id: 'sub-bio',
            name: 'Biochemistry',
            displayName: 'Biochemistry Lab',
            printOrder: 1,
            categoryRel: diagCategory,
          },
          categoryRel: diagCategory,
        },
      },
      // Legacy free-text item — no service link → "Other Charges" at the end
      {
        id: 'i4',
        itemName: 'Miscellaneous Charge',
        quantity: 1,
        unitPrice: 0,
        totalAmount: 0,
        createdAt: new Date('2026-10-07T10:00:03Z'),
        service: null,
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceBuilderService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<InvoiceBuilderService>(InvoiceBuilderService);
    jest.clearAllMocks();
  });

  it('throws NotFoundException when bill does not exist', async () => {
    mockPrisma.opdBill.findFirst.mockResolvedValue(null);

    await expect(service.buildInvoiceData(tenantId, billId)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('groups items by category sorted on sortOrder, "Other Charges" last', async () => {
    mockPrisma.opdBill.findFirst.mockResolvedValue(bill);

    const result = await service.buildInvoiceData(tenantId, billId);

    const categoryOrder = result.groupedItems.map((g) => g.categoryCode);
    expect(categoryOrder).toEqual(['DIAG', 'CONS', 'OTHER']);
  });

  it('sorts sub-categories by printOrder inside a category', async () => {
    mockPrisma.opdBill.findFirst.mockResolvedValue(bill);

    const result = await service.buildInvoiceData(tenantId, billId);

    const diag = result.groupedItems.find((g) => g.categoryCode === 'DIAG');
    expect(diag.subCategories.map((s) => s.subCategoryName)).toEqual([
      'Biochemistry Lab', // displayName preferred, printOrder 1
      'Hematology Lab', // printOrder 2
    ]);
  });

  it('maps line items with name/qty/rate/amount', async () => {
    mockPrisma.opdBill.findFirst.mockResolvedValue(bill);

    const result = await service.buildInvoiceData(tenantId, billId);

    const diag = result.groupedItems.find((g) => g.categoryCode === 'DIAG');
    expect(diag.subCategories[0].items).toEqual([
      { name: 'Blood Sugar Fasting', qty: 1, rate: 120, amount: 120 },
    ]);
  });

  it('returns bill header and totals', async () => {
    mockPrisma.opdBill.findFirst.mockResolvedValue(bill);

    const result = await service.buildInvoiceData(tenantId, billId);

    expect(result.bill).toMatchObject({
      billNo: 'BILL-20261007-0001',
      patientName: 'Ramesh Kumar',
      patientUhid: 'PT-0001',
      appointmentNo: 'APT-001',
    });
    expect(result.totals).toEqual({
      subtotal: 820,
      discount: 0,
      discountPercent: 0,
      tax: 0,
      grandTotal: 820,
      paid: 0,
      due: 820,
    });
  });
});
