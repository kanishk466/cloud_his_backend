import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { BedsService } from '../services/beds.service';
import { BedsRepository } from '../repositories/beds.repository';
import { BedStatusRepository } from '../repositories/bed-status.repository';

const mockBedsRepo = {
  findRoom: jest.fn(),
  create: jest.fn(),
  bulkCreate: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  softDelete: jest.fn(),
};

const mockBedStatusRepo = {
  getCurrentStatus: jest.fn(),
};

describe('BedsService', () => {
  let service: BedsService;

  const tenantId = 'tenant-uuid';
  const roomId = 'room-uuid';
  const bedId = 'bed-uuid';
  const room = { id: roomId, roomNumber: 'GW-1', isActive: true };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BedsService,
        { provide: BedsRepository, useValue: mockBedsRepo },
        { provide: BedStatusRepository, useValue: mockBedStatusRepo },
      ],
    }).compile();

    service = module.get<BedsService>(BedsService);
    jest.clearAllMocks();
  });

  // ─── Single create ────────────────────────────────────────────────────
  describe('create', () => {
    it('creates a bed with auto-generated identifier', async () => {
      mockBedsRepo.findRoom.mockResolvedValue(room);
      mockBedsRepo.create.mockResolvedValue({
        id: bedId,
        bedNumber: '01',
        bedIdentifier: 'GW-1/01',
      });

      const result = await service.create(tenantId, {
        roomId,
        bedNumber: '01',
      });

      expect(mockBedsRepo.create).toHaveBeenCalledWith(
        tenantId,
        roomId,
        'GW-1',
        '01',
      );
      expect(result.bedIdentifier).toBe('GW-1/01');
    });

    it('rejects a room from another tenant (404)', async () => {
      mockBedsRepo.findRoom.mockResolvedValue(null);

      await expect(
        service.create(tenantId, { roomId, bedNumber: '01' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── Bulk generator ───────────────────────────────────────────────────
  describe('bulkCreate', () => {
    it('creates beds 01…20 in one room', async () => {
      mockBedsRepo.findRoom.mockResolvedValue(room);
      mockBedsRepo.bulkCreate.mockResolvedValue({ created: 20 });

      const result = await service.bulkCreate(tenantId, {
        roomId,
        startNumber: 1,
        endNumber: 20,
      });

      const [, , roomNumber, bedNumbers] =
        mockBedsRepo.bulkCreate.mock.calls[0];
      expect(roomNumber).toBe('GW-1');
      expect(bedNumbers).toHaveLength(20);
      expect(bedNumbers[0]).toBe('01');
      expect(bedNumbers[19]).toBe('20');
      expect(result).toEqual({ created: 20, skipped: 0, errors: [] });
    });

    it('reports skipped duplicates without failing', async () => {
      mockBedsRepo.findRoom.mockResolvedValue(room);
      mockBedsRepo.bulkCreate.mockResolvedValue({ created: 7 });

      const result = await service.bulkCreate(tenantId, {
        roomId,
        startNumber: 1,
        endNumber: 10,
      });

      expect(result.created).toBe(7);
      expect(result.skipped).toBe(3);
      expect(result.errors[0]).toContain('3 bed(s) already existed');
    });

    it('supports a prefix (A01…A05)', async () => {
      mockBedsRepo.findRoom.mockResolvedValue(room);
      mockBedsRepo.bulkCreate.mockResolvedValue({ created: 5 });

      await service.bulkCreate(tenantId, {
        roomId,
        startNumber: 1,
        endNumber: 5,
        prefix: 'A',
      });

      const [, , , bedNumbers] = mockBedsRepo.bulkCreate.mock.calls[0];
      expect(bedNumbers).toEqual(['A01', 'A02', 'A03', 'A04', 'A05']);
    });

    it('rejects endNumber < startNumber', async () => {
      await expect(
        service.bulkCreate(tenantId, { roomId, startNumber: 10, endNumber: 5 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── Delete guard ─────────────────────────────────────────────────────
  describe('remove', () => {
    const bed = { id: bedId, bedIdentifier: 'GW-1/01' };

    it.each(['OCCUPIED', 'RESERVED'])(
      'blocks delete when bed is %s (409)',
      async (status) => {
        mockBedsRepo.findById.mockResolvedValue(bed);
        mockBedStatusRepo.getCurrentStatus.mockResolvedValue({ status });

        await expect(service.remove(tenantId, bedId)).rejects.toMatchObject({
          response: expect.objectContaining({ code: 'BED_DELETE_BLOCKED' }),
        });
        await expect(service.remove(tenantId, bedId)).rejects.toThrow(
          ConflictException,
        );

        expect(mockBedsRepo.softDelete).not.toHaveBeenCalled();
      },
    );

    it('allows delete when bed is AVAILABLE', async () => {
      mockBedsRepo.findById.mockResolvedValue(bed);
      mockBedStatusRepo.getCurrentStatus.mockResolvedValue({
        status: 'AVAILABLE',
      });
      mockBedsRepo.softDelete.mockResolvedValue(bed);

      const result = await service.remove(tenantId, bedId);

      expect(result.message).toBe('Bed deleted successfully');
      expect(mockBedsRepo.softDelete).toHaveBeenCalledWith(tenantId, bedId);
    });
  });
});
