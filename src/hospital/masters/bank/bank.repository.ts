import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { CreateBankDto } from './dto/create-bank.dto';
import { UpdateBankDto } from './dto/update-bank.dto';

@Injectable()
export class BankRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, dto: CreateBankDto) {
    return this.prisma.bank.create({ data: { ...dto, tenantId } });
  }

  findAll(tenantId: string, isActive?: boolean) {
    return this.prisma.bank.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
      },
      orderBy: { bankName: 'asc' },
    });
  }

  findById(tenantId: string, id: string) {
    return this.prisma.bank.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
  }

  update(tenantId: string, id: string, dto: UpdateBankDto) {
    return this.prisma.bank.update({
      where: { id, tenantId },
      data: dto,
    });
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.bank.update({
      where: { id, tenantId },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}
