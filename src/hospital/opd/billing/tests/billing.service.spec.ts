import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { BillingService } from '../billing.service';
import { BillingRepository } from '../billing.repository';
import { BillLineValidatorService } from '../services/bill-line-validator.service';
import { ReferralCommissionsService } from '../../../masters/doctor-setup/services/referral-commissions.service';

const mockRepository = {
  findServiceForBilling: jest.fn(),
  findPanelServiceRate: jest.fn(),
  findDoctor: jest.fn(),
  findPanel: jest.fn(),
  getPanelCoPay: jest.fn(),
  getPatient: jest.fn(),
  getAppointment: jest.fn(),
  findByAppointmentId: jest.fn(),
  findConsultationService: jest.fn(),
  generateBillNo: jest.fn(),
  generateReceiptNo: jest.fn(),
  create: jest.fn(),
  createBillWithPayment: jest.fn(),
};

const mockValidator = { validateBillLine: jest.fn() };
const mockReferral = { createForBill: jest.fn() };

describe('BillingService — rate resolution hierarchy (CRITICAL)', () => {
  let service: BillingService;

  const tenantId = 'tenant-uuid';
  const serviceId = 'service-uuid';
  const panelId = 'panel-uuid';
  const doctorId = 'doctor-uuid';

  const consultService = {
    id: serviceId,
    serviceCode: 'CONS-OPD',
    serviceName: 'OPD Consultation',
    baseRate: 300,
    rateEditable: false,
    discountable: true,
    isActive: true,
    categoryRel: { id: 'c1', name: 'Consultation', code: 'CONS' },
  };

  const labService = {
    ...consultService,
    serviceCode: 'LAB-CBC',
    serviceName: 'Complete Blood Count',
    baseRate: 250,
    categoryRel: { id: 'c2', name: 'Diagnostics / Lab', code: 'DIAG' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: BillingRepository, useValue: mockRepository },
        { provide: BillLineValidatorService, useValue: mockValidator },
        { provide: ReferralCommissionsService, useValue: mockReferral },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
    jest.clearAllMocks();
  });

  describe('resolveRate()', () => {
    it('priority 1 — uses the panel tariff rate when one exists', async () => {
      mockRepository.findServiceForBilling.mockResolvedValue(consultService);
      mockRepository.findPanelServiceRate.mockResolvedValue({ rate: 500 });
      mockRepository.findDoctor.mockResolvedValue({
        id: doctorId,
        consultationFee: 400,
      });

      const result = await service.resolveRate(
        tenantId,
        serviceId,
        panelId,
        doctorId,
      );

      // Panel rate (500) beats both the doctor fee (400) and base (300)
      expect(result.rate).toBe(500);
      expect(result.source).toBe('PANEL');
      expect(mockRepository.findPanelServiceRate).toHaveBeenCalledWith(
        tenantId,
        panelId,
        serviceId,
      );
    });

    it('priority 2 — uses the doctor consultationFee for CONS services without a panel rate', async () => {
      mockRepository.findServiceForBilling.mockResolvedValue(consultService);
      mockRepository.findPanelServiceRate.mockResolvedValue(null);
      mockRepository.findDoctor.mockResolvedValue({
        id: doctorId,
        consultationFee: 400,
      });

      const result = await service.resolveRate(
        tenantId,
        serviceId,
        panelId,
        doctorId,
      );

      expect(result.rate).toBe(400);
      expect(result.source).toBe('DOCTOR');
    });

    it('priority 2 — works with no panel at all (doctor fee still wins)', async () => {
      mockRepository.findServiceForBilling.mockResolvedValue(consultService);
      mockRepository.findDoctor.mockResolvedValue({
        id: doctorId,
        consultationFee: 450,
      });

      const result = await service.resolveRate(
        tenantId,
        serviceId,
        null,
        doctorId,
      );

      expect(mockRepository.findPanelServiceRate).not.toHaveBeenCalled();
      expect(result.rate).toBe(450);
      expect(result.source).toBe('DOCTOR');
    });

    it('priority 3 — falls back to baseRate for non-CONS services even with a doctor', async () => {
      mockRepository.findServiceForBilling.mockResolvedValue(labService);
      mockRepository.findPanelServiceRate.mockResolvedValue(null);

      const result = await service.resolveRate(
        tenantId,
        serviceId,
        panelId,
        doctorId,
      );

      // Lab service: doctor fee must NOT apply
      expect(result.rate).toBe(250);
      expect(result.source).toBe('BASE');
      expect(mockRepository.findDoctor).not.toHaveBeenCalled();
    });

    it('priority 3 — falls back to baseRate when the doctor has no fee configured', async () => {
      mockRepository.findServiceForBilling.mockResolvedValue(consultService);
      mockRepository.findPanelServiceRate.mockResolvedValue(null);
      mockRepository.findDoctor.mockResolvedValue({
        id: doctorId,
        consultationFee: 0,
      });

      const result = await service.resolveRate(
        tenantId,
        serviceId,
        null,
        doctorId,
      );

      expect(result.rate).toBe(300);
      expect(result.source).toBe('BASE');
    });

    it('rejects unknown or inactive services', async () => {
      mockRepository.findServiceForBilling.mockResolvedValue({
        ...consultService,
        isActive: false,
      });

      await expect(
        service.resolveRate(tenantId, serviceId, null, null),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('generateBill() — consultation auto-add dedup (double-charge regression)', () => {
    const tenantId = 'tenant-uuid';
    const patientId = 'patient-uuid';

    const appointment = {
      id: 'apt-uuid',
      appointmentNo: 'APT-20261018-0001',
      consultationFee: 500,
      doctorProfileId: 'doc-uuid',
    };

    const manualConsultLine = {
      serviceId: 'svc-cons',
      serviceName: 'opd consultation',
      quantity: 1,
      unitRate: 500,
    };

    const billEntity = {
      id: 'bill-uuid',
      billNo: 'INV-OPD-20261018-0005',
      items: [],
      payments: [],
      creditNotes: [],
    };

    const baseDto = (item: any) => ({
      patientId,
      appointmentId: appointment.id,
      items: [item],
    });

    beforeEach(() => {
      mockRepository.getAppointment.mockResolvedValue(appointment);
      mockRepository.findByAppointmentId.mockResolvedValue(null);
      mockRepository.getPatient.mockResolvedValue({ id: patientId, panelId: null });
      mockRepository.findDoctor.mockResolvedValue({
        id: 'doc-uuid',
        consultationFee: 500,
      });
      mockRepository.findServiceForBilling.mockImplementation(
        (_tenantId: string, serviceId: string) =>
          Promise.resolve(
            serviceId === 'svc-lab'
              ? labService
              : { ...consultService, subCategoryRel: null },
          ),
      );
      mockRepository.findPanelServiceRate.mockResolvedValue(null);
      // Free-text fallback: no seeded CONS/OPD consultation service
      mockRepository.findConsultationService.mockResolvedValue(null);
      mockRepository.generateBillNo.mockResolvedValue('INV-OPD-20261018-0005');
      mockRepository.create.mockResolvedValue(billEntity);
      mockValidator.validateBillLine.mockResolvedValue({ isValid: true });
      mockReferral.createForBill.mockResolvedValue(undefined);
    });

    it('does NOT auto-add a consultation line when one was already billed manually', async () => {
      await service.generateBill(tenantId, 'user-uuid', baseDto(manualConsultLine) as any);

      const createArgs = mockRepository.create.mock.calls[0][0];
      expect(createArgs.items).toHaveLength(1);
      expect(createArgs.items[0].description).not.toBe('Consultation Fee');
      // Net stays ₹500, not ₹1,000
      expect(createArgs.totalAmount).toBe(500);
    });

    it('still auto-adds the consultation line when the counter did not bill one', async () => {
      const labLine = {
        serviceId: 'svc-lab',
        serviceName: 'CBC',
        quantity: 1,
        unitRate: 250,
      };

      await service.generateBill(tenantId, 'user-uuid', baseDto(labLine) as any);

      const createArgs = mockRepository.create.mock.calls[0][0];
      expect(createArgs.items).toHaveLength(2);
      expect(createArgs.items[0].description).toBe('Consultation Fee');
      expect(createArgs.items[0].unitPrice).toBe(500);
    });

    it('dedups by serviceId when the seeded CONS/OPD service IS configured', async () => {
      // findConsultationService returns the same service the counter used
      mockRepository.findConsultationService.mockResolvedValue({
        id: 'svc-cons',
        serviceCode: 'CONS-OPD',
        serviceName: 'OPD Consultation',
      });

      await service.generateBill(tenantId, 'user-uuid', baseDto(manualConsultLine) as any);

      const createArgs = mockRepository.create.mock.calls[0][0];
      expect(createArgs.items).toHaveLength(1);
      expect(createArgs.totalAmount).toBe(500);
    });
  });

  describe('calculateBillItems() — spec V2 totals', () => {
    const calc = (input: any) =>
      (service as any).calculateBillItems(input);

    it('computes the spec example: 1 × ₹500 consultation, no discount → net ₹500', () => {
      const result = calc({
        items: [{ quantity: 1, unitPrice: 500 }],
        discountAmount: 0,
      });

      expect(result.subtotal).toBe(500);
      expect(result.totalAmount).toBe(500);
    });

    it('subtracts line-level discounts from the net total', () => {
      const result = calc({
        items: [
          { quantity: 1, unitPrice: 500, discountAmount: 50 },
          { quantity: 2, unitPrice: 100, discountPercent: 10 },
        ],
      });

      expect(result.subtotal).toBe(700); // gross
      expect(result.itemDiscountTotal).toBe(70); // 50 + 20
      expect(result.totalAmount).toBe(630); // net after line discounts
    });

    it('applies bill-level discount after line discounts', () => {
      const result = calc({
        items: [{ quantity: 1, unitPrice: 1000, discountAmount: 100 }],
        discountPercent: 10, // 10% of (1000 − 100) = 90
      });

      expect(result.totalAmount).toBe(810); // 1000 − 100 − 90
      expect(result.discountAmount).toBe(90);
    });
  });
});
