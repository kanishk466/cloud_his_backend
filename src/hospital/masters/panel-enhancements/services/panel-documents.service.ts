import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PanelDocumentsRepository } from '../repositories/panel-documents.repository';
import { CreatePanelDocumentDto } from '../dto/panel-document/create-panel-document.dto';
import { UpdatePanelDocumentDto } from '../dto/panel-document/update-panel-document.dto';
import {
  deletePanelDocumentTemplate,
  savePanelDocumentTemplate,
} from '../../../../common/utils/file-upload.util';

@Injectable()
export class PanelDocumentsService {
  constructor(private readonly repo: PanelDocumentsRepository) {}

  async create(tenantId: string, dto: CreatePanelDocumentDto) {
    const panel = await this.repo.findPanel(tenantId, dto.panelId);
    if (!panel) throw new NotFoundException('Panel not found in this hospital');

    try {
      return await this.repo.create(tenantId, dto);
    } catch (e) {
      this.rethrowConflict(e);
    }
  }

  findAll(tenantId: string, isActive?: boolean) {
    return this.repo.findAll(tenantId, isActive);
  }

  /** Claim checklist for a panel, optionally scoped to OPD/IPD. */
  async findByPanel(tenantId: string, panelId: string, module?: 'OPD' | 'IPD') {
    const panel = await this.repo.findPanel(tenantId, panelId);
    if (!panel) throw new NotFoundException('Panel not found in this hospital');
    return this.repo.findByPanel(tenantId, panelId, module);
  }

  async findOne(tenantId: string, id: string) {
    const doc = await this.repo.findById(tenantId, id);
    if (!doc) throw new NotFoundException('Panel document not found');
    return doc;
  }

  async update(tenantId: string, id: string, dto: UpdatePanelDocumentDto) {
    await this.findOne(tenantId, id);
    try {
      return await this.repo.update(tenantId, id, dto);
    } catch (e) {
      this.rethrowConflict(e);
    }
  }

  // ─── Blank template upload (PDF/PNG/JPG ≤ 10 MB) ────────────────────────────

  async uploadTemplate(
    tenantId: string,
    id: string,
    file: Express.Multer.File,
  ) {
    const doc = await this.findOne(tenantId, id);

    const saved = savePanelDocumentTemplate(id, file);

    if (doc.templateFileUrl) {
      deletePanelDocumentTemplate(doc.templateFileUrl);
    }

    return this.repo.updateTemplateUrl(tenantId, id, saved.url);
  }

  async remove(tenantId: string, id: string) {
    const doc = await this.findOne(tenantId, id);

    if (doc.templateFileUrl) {
      deletePanelDocumentTemplate(doc.templateFileUrl);
    }

    await this.repo.softDelete(tenantId, id);
    return { message: 'Panel document deleted successfully' };
  }

  private rethrowConflict(e: unknown): never {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      throw new ConflictException(
        'A document with this code already exists for this panel',
      );
    }
    throw e;
  }
}
