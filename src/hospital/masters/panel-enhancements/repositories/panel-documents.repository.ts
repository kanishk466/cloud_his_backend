import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { CreatePanelDocumentDto } from '../dto/panel-document/create-panel-document.dto';
import { UpdatePanelDocumentDto } from '../dto/panel-document/update-panel-document.dto';

const PANEL_SELECT = {
  select: { id: true, panelCode: true, panelName: true },
} as const;

@Injectable()
export class PanelDocumentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, dto: CreatePanelDocumentDto) {
    return this.prisma.panelDocument.create({
      data: { ...dto, tenantId },
      include: { panel: PANEL_SELECT },
    });
  }

  findAll(tenantId: string, isActive?: boolean) {
    return this.prisma.panelDocument.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
      },
      include: { panel: PANEL_SELECT },
      orderBy: [{ panelId: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  /** Claim checklist for a panel, optionally scoped to OPD/IPD. */
  findByPanel(tenantId: string, panelId: string, module?: 'OPD' | 'IPD') {
    return this.prisma.panelDocument.findMany({
      where: {
        tenantId,
        panelId,
        deletedAt: null,
        isActive: true,
        ...(module === 'OPD' ? { appliesToOpd: true } : {}),
        ...(module === 'IPD' ? { appliesToIpd: true } : {}),
      },
      orderBy: [{ isMandatory: 'desc' }, { sortOrder: 'asc' }],
    });
  }

  findById(tenantId: string, id: string) {
    return this.prisma.panelDocument.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { panel: PANEL_SELECT },
    });
  }

  update(tenantId: string, id: string, dto: UpdatePanelDocumentDto) {
    return this.prisma.panelDocument.update({
      where: { id, tenantId },
      data: dto,
      include: { panel: PANEL_SELECT },
    });
  }

  updateTemplateUrl(tenantId: string, id: string, url: string | null) {
    return this.prisma.panelDocument.update({
      where: { id, tenantId },
      data: { templateFileUrl: url },
      include: { panel: PANEL_SELECT },
    });
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.panelDocument.update({
      where: { id, tenantId },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  findPanel(tenantId: string, panelId: string) {
    return this.prisma.panel.findFirst({
      where: { id: panelId, tenantId, deletedAt: null },
      select: { id: true },
    });
  }
}
