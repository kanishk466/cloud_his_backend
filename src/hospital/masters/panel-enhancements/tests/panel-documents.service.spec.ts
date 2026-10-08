import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PanelDocumentsService } from '../services/panel-documents.service';
import { PanelDocumentsRepository } from '../repositories/panel-documents.repository';

const mockRepo = {
  create: jest.fn(),
  findAll: jest.fn(),
  findByPanel: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  updateTemplateUrl: jest.fn(),
  softDelete: jest.fn(),
  findPanel: jest.fn(),
};

const p2002 = new Prisma.PrismaClientKnownRequestError('Unique', {
  code: 'P2002',
  clientVersion: '5.22.0',
});

describe('PanelDocumentsService', () => {
  let service: PanelDocumentsService;

  const tenantId = 'tenant-uuid';
  const panelId = 'panel-uuid';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PanelDocumentsService,
        { provide: PanelDocumentsRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<PanelDocumentsService>(PanelDocumentsService);
    jest.clearAllMocks();

    mockRepo.findPanel.mockResolvedValue({ id: panelId });
  });

  it('creates a document for a valid panel', async () => {
    mockRepo.create.mockResolvedValue({ id: 'd-1' });

    await service.create(tenantId, {
      panelId,
      documentName: 'TPA Pre-Authorization Form',
      documentCode: 'PRE_AUTH_FORM',
    });

    expect(mockRepo.create).toHaveBeenCalled();
  });

  it('throws ConflictException on duplicate documentCode for the panel', async () => {
    mockRepo.create.mockRejectedValue(p2002);

    await expect(
      service.create(tenantId, {
        panelId,
        documentName: 'X',
        documentCode: 'PRE_AUTH_FORM',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('returns the claim checklist for a panel', async () => {
    mockRepo.findByPanel.mockResolvedValue([
      { documentCode: 'PRE_AUTH_FORM', isMandatory: true },
      { documentCode: 'CLAIM_FORM_B', isMandatory: true },
    ]);

    const result = await service.findByPanel(tenantId, panelId);

    expect(mockRepo.findByPanel).toHaveBeenCalledWith(
      tenantId,
      panelId,
      undefined,
    );
    expect(result).toHaveLength(2);
  });

  it('scopes the checklist by module', async () => {
    mockRepo.findByPanel.mockResolvedValue([]);

    await service.findByPanel(tenantId, panelId, 'IPD');

    expect(mockRepo.findByPanel).toHaveBeenCalledWith(tenantId, panelId, 'IPD');
  });

  it('rejects checklist for unknown panel (404)', async () => {
    mockRepo.findPanel.mockResolvedValue(null);

    await expect(service.findByPanel(tenantId, panelId)).rejects.toThrow(
      NotFoundException,
    );
  });
});
