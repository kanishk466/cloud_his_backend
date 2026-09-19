import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { CreateTariffDto } from './dto/create-tariff.dto';
import { SetServiceRateDto } from './dto/set-service-rate.dto';

@Injectable()
export class TariffService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── TARIFF CRUD ───────────────────────────────────────────
  async create(tenantId: string, dto: CreateTariffDto) {
    const exists = await this.prisma.tariffMaster.findFirst({
      where: { tenantId, tariffCode: dto.tariffCode, deletedAt: null },
    });
    if (exists) throw new ConflictException(`Tariff code '${dto.tariffCode}' already exists`);

    return this.prisma.tariffMaster.create({
      data: { tenantId, ...dto },
    });
  }

  async list(tenantId: string, search?: string) {
    return this.prisma.tariffMaster.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(search && {
          OR: [
            { tariffName: { contains: search, mode: 'insensitive' } },
            { tariffCode: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      include: { _count: { select: { rates: true } } },
      orderBy: { tariffName: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const item = await this.prisma.tariffMaster.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        rates: {
          where: { isActive: true },
          include: {
            service: { select: { id: true, serviceCode: true, serviceName: true, baseRate: true, category: true } },
          },
        },
      },
    });
    if (!item) throw new NotFoundException('Tariff not found');
    return item;
  }

  async update(tenantId: string, id: string, dto: Partial<CreateTariffDto>) {
    await this.findOne(tenantId, id);
    return this.prisma.tariffMaster.update({ where: { id }, data: dto });
  }

  async remove(tenantId: string, id: string) {
    // Check if any Panel is using this tariff
    const usedBy = await this.prisma.panel.count({
      where: {
        tenantId,
        deletedAt: null,
        OR: [{ opdTariffId: id }, { ipdTariffId: id }],
      },
    });
    if (usedBy > 0) {
      throw new BadRequestException(
        `Cannot delete. ${usedBy} panel(s) are using this tariff. Unlink them first.`,
      );
    }

    return this.prisma.tariffMaster.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  // ─── SERVICE RATE MANAGEMENT ───────────────────────────────
  async setServiceRate(tenantId: string, tariffId: string, dto: SetServiceRateDto) {
    // Validate tariff
    const tariff = await this.prisma.tariffMaster.findFirst({
      where: { id: tariffId, tenantId, deletedAt: null },
    });
    if (!tariff) throw new NotFoundException('Tariff not found');

    // Validate service
    const service = await this.prisma.serviceMaster.findFirst({
      where: { id: dto.serviceId, tenantId, deletedAt: null },
    });
    if (!service) throw new NotFoundException('Service not found');

    // Upsert rate
    return this.prisma.panelServiceRate.upsert({
      where: {
        tariffId_serviceId: { tariffId, serviceId: dto.serviceId },
      },
      create: {
        tenantId,
        tariffId,
        serviceId: dto.serviceId,
        rate: dto.rate,
        discountPercent: dto.discountPercent ?? 0,
      },
      update: {
        rate: dto.rate,
        discountPercent: dto.discountPercent ?? 0,
        isActive: true,
      },
    });
  }

  async bulkSetRates(tenantId: string, tariffId: string, rates: SetServiceRateDto[]) {
    const results = [];
    for (const rate of rates) {
      const result = await this.setServiceRate(tenantId, tariffId, rate);
      results.push(result);
    }
    return { updated: results.length, rates: results };
  }

  async removeServiceRate(tenantId: string, tariffId: string, serviceId: string) {
    const rate = await this.prisma.panelServiceRate.findFirst({
      where: { tenantId, tariffId, serviceId },
    });
    if (!rate) throw new NotFoundException('Rate mapping not found');

    return this.prisma.panelServiceRate.update({
      where: { id: rate.id },
      data: { isActive: false },
    });
  }

  // ─── DROPDOWN for Panel Form ───────────────────────────────
  async getDropdown(tenantId: string) {
    return this.prisma.tariffMaster.findMany({
      where: { tenantId, isActive: true, deletedAt: null },
      select: { id: true, tariffCode: true, tariffName: true },
      orderBy: { tariffName: 'asc' },
    });
  }
}