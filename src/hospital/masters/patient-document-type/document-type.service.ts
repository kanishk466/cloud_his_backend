import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DocumentTypeRepository } from './document-type.repository';
import { CreateDocumentTypeDto } from './dto/create-document-type.dto';
import { UpdateDocumentTypeDto } from './dto/update-document-type.dto';

@Injectable()
export class DocumentTypeService {
  constructor(private readonly repo: DocumentTypeRepository) {}

  async create(tenantId: string, dto: CreateDocumentTypeDto) {
    try {
      return await this.repo.create(tenantId, dto);
    } catch (e) {
      this.rethrowConflict(e);
    }
  }

  findAll(tenantId: string, isActive?: boolean) {
    return this.repo.findAll(tenantId, isActive);
  }

  async findOne(tenantId: string, id: string) {
    const docType = await this.repo.findById(tenantId, id);
    if (!docType) throw new NotFoundException('Document type not found');
    return docType;
  }

  async update(tenantId: string, id: string, dto: UpdateDocumentTypeDto) {
    await this.findOne(tenantId, id);
    try {
      return await this.repo.update(tenantId, id, dto);
    } catch (e) {
      this.rethrowConflict(e);
    }
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.repo.softDelete(tenantId, id);
    return { message: 'Document type deleted successfully' };
  }

  private rethrowConflict(e: unknown): never {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      throw new ConflictException('Document type code already exists');
    }
    throw e;
  }
}
