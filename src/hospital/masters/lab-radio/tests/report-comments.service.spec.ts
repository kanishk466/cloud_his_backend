import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ReportCommentsService } from '../services/report-comments.service';
import { ReportCommentsRepository } from '../repositories/report-comments.repository';

const mockRepo = {
  create: jest.fn(),
  findAll: jest.fn(),
  findByShortcut: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
  findLabDepartment: jest.fn(),
};

const p2002 = new Prisma.PrismaClientKnownRequestError('Unique', {
  code: 'P2002',
  clientVersion: '5.22.0',
});

describe('ReportCommentsService', () => {
  let service: ReportCommentsService;

  const tenantId = 'tenant-uuid';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportCommentsService,
        { provide: ReportCommentsRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<ReportCommentsService>(ReportCommentsService);
    jest.clearAllMocks();
  });

  it('creates a global comment (no department)', async () => {
    mockRepo.create.mockResolvedValue({ id: 'c-1' });

    await service.create(tenantId, {
      category: 'SAMPLE_QUALITY',
      commentText: 'Sample hemolyzed — results may be affected.',
      shortcut: 'HEM',
    });

    expect(mockRepo.create).toHaveBeenCalled();
    expect(mockRepo.findLabDepartment).not.toHaveBeenCalled();
  });

  it('throws ConflictException on duplicate shortcut (P2002)', async () => {
    mockRepo.create.mockRejectedValue(p2002);

    await expect(
      service.create(tenantId, { commentText: 'X', shortcut: 'HEM' }),
    ).rejects.toThrow(ConflictException);
  });

  it('quick lookup returns the comment (case-insensitive)', async () => {
    mockRepo.findByShortcut.mockResolvedValue({
      id: 'c-1',
      shortcut: 'HEM',
      commentText: 'Sample hemolyzed — results may be affected.',
    });

    const result = await service.getByShortcut(tenantId, 'hem');

    expect(mockRepo.findByShortcut).toHaveBeenCalledWith(tenantId, 'hem');
    expect(result.shortcut).toBe('HEM');
  });

  it('quick lookup throws 404 for unknown shortcut', async () => {
    mockRepo.findByShortcut.mockResolvedValue(null);

    await expect(service.getByShortcut(tenantId, 'NOPE')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('list passes filters through (global comments included by repo)', async () => {
    mockRepo.findAll.mockResolvedValue([{ id: 'c-1' }]);

    const result = await service.findAll(tenantId, {
      labDepartmentId: 'dept-1',
      category: 'SAMPLE_QUALITY',
    });

    expect(mockRepo.findAll).toHaveBeenCalledWith(tenantId, {
      labDepartmentId: 'dept-1',
      category: 'SAMPLE_QUALITY',
      search: undefined,
      isActive: undefined,
    });
    expect(result).toHaveLength(1);
  });
});
