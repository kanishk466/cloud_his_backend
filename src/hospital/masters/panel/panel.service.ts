import {
  Injectable, NotFoundException, BadRequestException,
  ConflictException, Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { CreatePanelDto } from './dto/create-panel.dto';
import { UpdatePanelDto } from './dto/update-panel.dto';
import { ListPanelQueryDto } from './dto/list-panel-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class PanelService {
  private readonly logger = new Logger(PanelService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════
  // CREATE
  // ═══════════════════════════════════════════════════════════
  async create(tenantId: string, dto: CreatePanelDto) {
    // 1. Date validation
    if (dto.validFrom && dto.validTo) {
      if (new Date(dto.validFrom) >= new Date(dto.validTo)) {
        throw new BadRequestException('validTo must be after validFrom');
      }
    }

    // 2. Duplicate name check
    const existing = await this.prisma.panel.findFirst({
      where: {
        tenantId,
        panelName: { equals: dto.panelName, mode: 'insensitive' },
        deletedAt: null,
      },
    });
    if (existing) {
      throw new ConflictException(`Panel '${dto.panelName}' already exists`);
    }

    // 3. Validate GlobalMaster IDs (if provided)
    await this.validateGlobalMasterIds(tenantId, dto);

    // 4. Validate Tariff IDs (if provided)
    if (dto.opdTariffId) await this.validateTariff(tenantId, dto.opdTariffId, 'OPD');
    if (dto.ipdTariffId) await this.validateTariff(tenantId, dto.ipdTariffId, 'IPD');

    // 5. USD conversion check
    if (dto.isUsdBased && (!dto.currencyConv || dto.currencyConv <= 0)) {
      throw new BadRequestException('Currency conversion rate is required for USD-based panels');
    }

    // 6. Co-payment check
    if (dto.coPaymentOn && dto.coPaymentOn !== 'NONE') {
      if (dto.coPaymentPercent === undefined || dto.coPaymentPercent === null) {
        throw new BadRequestException('coPaymentPercent is required when Co-Payment is enabled');
      }
    }

    // 7. Generate panel code
    const panelCode = await this.generatePanelCode(tenantId);

    const panel = await this.prisma.panel.create({
      data: {
        tenantId,
        panelCode,
        panelName: dto.panelName,
        groupTypeId: dto.groupTypeId,
        paymentModeId: dto.paymentModeId,
        panelTypeId: dto.panelTypeId,
        rateCurrencyId: dto.rateCurrencyId,
        billCurrencyId: dto.billCurrencyId,
        contactPerson: dto.contactPerson,
        address1: dto.address1,
        address2: dto.address2,
        contactNo: dto.contactNo,
        phoneNo: dto.phoneNo,
        email: dto.email,
        faxNo: dto.faxNo,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        validTo: dto.validTo ? new Date(dto.validTo) : null,
        creditLimit: dto.creditLimit ?? 0,
        opdTariffId: dto.opdTariffId,
        ipdTariffId: dto.ipdTariffId,
        rateTypeSelfOpd: dto.rateTypeSelfOpd ?? false,
        rateTypeSelfIpd: dto.rateTypeSelfIpd ?? false,
        showPrintout: dto.showPrintout ?? true,
        hideRate: dto.hideRate ?? false,
        coverNote: dto.coverNote ?? false,
        isSmartCard: dto.isSmartCard ?? false,
        hasEncounter: dto.hasEncounter ?? false,
        isUsdBased: dto.isUsdBased ?? false,
        dietTypePrivate: dto.dietTypePrivate ?? false,
        coPaymentOn: dto.coPaymentOn ?? 'NONE',
        coPaymentPercent: dto.coPaymentPercent ?? 0,
        currencyConv: dto.currencyConv ?? 1,
        panelAmount: dto.panelAmount,
      },
      include: this.defaultIncludes(),
    });

    this.logger.log(`Panel created: ${panelCode} — ${dto.panelName}`);
    return panel;
  }

  // ═══════════════════════════════════════════════════════════
  // LIST
  // ═══════════════════════════════════════════════════════════
  async list(tenantId: string, query: ListPanelQueryDto) {
    const { page = 1, limit = 20, search, groupTypeId, isActive } = query;

    const where: Prisma.PanelWhereInput = {
      tenantId,
      deletedAt: null,
      ...(groupTypeId && { groupTypeId }),
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { panelName: { contains: search, mode: 'insensitive' } },
          { panelCode: { contains: search, mode: 'insensitive' } },
          { contactPerson: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.panel.findMany({
        where,
        include: this.defaultIncludes(),
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.panel.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ═══════════════════════════════════════════════════════════
  // GET ONE
  // ═══════════════════════════════════════════════════════════
  async findOne(tenantId: string, id: string) {
    const panel = await this.prisma.panel.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: this.defaultIncludes(),
    });
    if (!panel) throw new NotFoundException(`Panel not found`);
    return panel;
  }

  // ═══════════════════════════════════════════════════════════
  // UPDATE
  // ═══════════════════════════════════════════════════════════
  async update(tenantId: string, id: string, dto: UpdatePanelDto) {
    await this.findOne(tenantId, id);

    if (dto.validFrom && dto.validTo) {
      if (new Date(dto.validFrom) >= new Date(dto.validTo)) {
        throw new BadRequestException('validTo must be after validFrom');
      }
    }

    if (dto.panelName) {
      const dup = await this.prisma.panel.findFirst({
        where: {
          tenantId,
          panelName: { equals: dto.panelName, mode: 'insensitive' },
          deletedAt: null,
          NOT: { id },
        },
      });
      if (dup) throw new ConflictException(`Panel '${dto.panelName}' already exists`);
    }

    await this.validateGlobalMasterIds(tenantId, dto);
    if (dto.opdTariffId) await this.validateTariff(tenantId, dto.opdTariffId, 'OPD');
    if (dto.ipdTariffId) await this.validateTariff(tenantId, dto.ipdTariffId, 'IPD');

    return this.prisma.panel.update({
      where: { id },
      data: {
        ...dto,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validTo: dto.validTo ? new Date(dto.validTo) : undefined,
      },
      include: this.defaultIncludes(),
    });
  }

  // ═══════════════════════════════════════════════════════════
  // SOFT DELETE
  // ═══════════════════════════════════════════════════════════
  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);

    return this.prisma.panel.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  // ═══════════════════════════════════════════════════════════
  // DROPDOWN (for patient registration / billing screens)
  // ═══════════════════════════════════════════════════════════
  async getDropdown(tenantId: string) {
    const now = new Date();
    return this.prisma.panel.findMany({
      where: {
        tenantId,
        isActive: true,
        deletedAt: null,
        OR: [
          { validTo: null },
          { validTo: { gte: now } },
        ],
      },
      select: {
        id: true,
        panelCode: true,
        panelName: true,
        groupType: { select: { value: true } },
        panelType: { select: { value: true } },
      },
      orderBy: { panelName: 'asc' },
    });
  }

  // ═══════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════
  private async generatePanelCode(tenantId: string): Promise<string> {
    const year = new Date().getFullYear().toString();

    const seq = await this.prisma.tenantSequence.upsert({
      where: {
        tenantId_entityType_scopeKey: {
          tenantId,
          entityType: 'PANEL',
          scopeKey: year,
        },
      },
      create: { tenantId, entityType: 'PANEL', scopeKey: year, lastValue: 1 },
      update: { lastValue: { increment: 1 } },
    });

    return `PNL-${year}-${String(seq.lastValue).padStart(4, '0')}`;
  }

  private async validateTariff(tenantId: string, tariffId: string, label: string) {
    const tariff = await this.prisma.tariffMaster.findFirst({
      where: { id: tariffId, tenantId, deletedAt: null, isActive: true },
    });
    if (!tariff) throw new BadRequestException(`Invalid ${label} tariff selected`);
  }

  private async validateGlobalMasterIds(tenantId: string, dto: any) {
    const fields = [
      { id: dto.groupTypeId, type: 'GROUP_TYPE', label: 'Group Type' },
      { id: dto.paymentModeId, type: 'PAYMENT_MODE', label: 'Payment Mode' },
      { id: dto.panelTypeId, type: 'PANEL_TYPE', label: 'Panel Type' },
      { id: dto.rateCurrencyId, type: 'CURRENCY', label: 'Rate Currency' },
      { id: dto.billCurrencyId, type: 'CURRENCY', label: 'Bill Currency' },
    ];

    for (const field of fields) {
      if (!field.id) continue;
      const master = await this.prisma.globalMaster.findFirst({
        where: {
          id: field.id,
          tenantId,
          type: field.type as any,
          deletedAt: null,
          isActive: true,
        },
      });
      if (!master) {
        throw new BadRequestException(`Invalid ${field.label} selected`);
      }
    }
  }

  private defaultIncludes() {
    return {
      groupType: { select: { id: true, value: true } },
      paymentMode: { select: { id: true, value: true } },
      panelType: { select: { id: true, value: true } },
      rateCurrency: { select: { id: true, value: true } },
      billCurrency: { select: { id: true, value: true } },
      opdTariff: { select: { id: true, tariffCode: true, tariffName: true } },
      ipdTariff: { select: { id: true, tariffCode: true, tariffName: true } },
    };
  }
}