import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { CreateGlobalMasterDto } from './dto/create-global-master.dto';
import { UpdateGlobalMasterDto } from './dto/update-global-master.dto';
import { QueryGlobalMasterDto } from './dto/query-global-master.dto';
import { MasterValueType, Prisma } from '@prisma/client';

@Injectable()
export class GlobalMasterService {
  private readonly logger = new Logger(GlobalMasterService.name);

  // Sidebar UI order (matches screenshot layout)
  private readonly PANEL_BILLING_ORDER: MasterValueType[] = [
    'GROUP_TYPE',
    'PAYMENT_MODE',
    'RATE_TYPE',
    'CURRENCY',
    'PANEL_TYPE',
    'TAX_TYPE',
    'DISCOUNT_REASON',
    'REFUND_REASON',
    'CANCELLATION_REASON',
  ];

  private readonly CLINICAL_ORDER: MasterValueType[] = [
    'CONSULTATION_TYPE',
    'DIAGNOSIS_TYPE',
    'DIET_TYPE',
  ];

  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════
  // 1. CREATE — Add new value under a specific type
  // ═══════════════════════════════════════════════════════════════
  async create(tenantId: string, dto: CreateGlobalMasterDto) {
    // Validation: Category and type mapping
    this.validateCategoryTypeMapping(dto.category, dto.type);

    // Check for duplicate (case-insensitive) in same tenant + type
    const existing = await this.prisma.globalMaster.findFirst({
      where: {
        tenantId,
        type: dto.type,
        value: { equals: dto.value, mode: 'insensitive' },
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Value '${dto.value}' already exists in ${dto.type}.`,
      );
    }

    // Auto-calculate sortOrder if not provided
    let sortOrder = dto.sortOrder;
    if (sortOrder === undefined || sortOrder === null) {
      const lastItem = await this.prisma.globalMaster.findFirst({
        where: { tenantId, type: dto.type, deletedAt: null },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      });
      sortOrder = lastItem ? lastItem.sortOrder + 1 : 1;
    }

    try {
      const created = await this.prisma.globalMaster.create({
        data: {
          tenantId,
          category: dto.category,
          type: dto.type,
          value: dto.value,
          sortOrder,
          isSystem: false, // User-added items are never system defaults
          isActive: true,
        },
      });

      this.logger.log(`Created master value: ${dto.type} → '${dto.value}' for tenant ${tenantId}`);
      return created;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Value '${dto.value}' already exists.`);
      }
      throw e;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 2. GET SIDEBAR TREE — for left navigation with counts
  // ═══════════════════════════════════════════════════════════════
  async getSidebarTree(tenantId: string) {
    const allMasters = await this.prisma.globalMaster.findMany({
      where: { tenantId, deletedAt: null },
      select: { type: true },
    });

    // Count per type
    const counts: Record<string, number> = allMasters.reduce((acc, curr) => {
      acc[curr.type] = (acc[curr.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const formatLabel = (str: string) =>
      str
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');

    return {
      'PANEL / BILLING': this.PANEL_BILLING_ORDER.map((type) => ({
        type,
        label: formatLabel(type),
        count: counts[type] || 0,
      })),
      'CLINICAL': this.CLINICAL_ORDER.map((type) => ({
        type,
        label: formatLabel(type),
        count: counts[type] || 0,
      })),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // 3. GET VALUES BY TYPE — for right-side table listing
  // ═══════════════════════════════════════════════════════════════
  async getValuesByType(tenantId: string, type: MasterValueType, search?: string) {
    return this.prisma.globalMaster.findMany({
      where: {
        tenantId,
        type,
        deletedAt: null,
        ...(search && {
          value: { contains: search, mode: 'insensitive' },
        }),
      },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        value: true,
        isSystem: true,
        isActive: true,
        sortOrder: true,
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // 4. GET DROPDOWN VALUES — for use in other forms (e.g., Panel Form)
  // ═══════════════════════════════════════════════════════════════
  async getDropdownValues(tenantId: string, type: MasterValueType) {
    return this.prisma.globalMaster.findMany({
      where: {
        tenantId,
        type,
        isActive: true,
        deletedAt: null,
      },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        value: true,
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // 5. UPDATE — Edit value or toggle active status
  // ═══════════════════════════════════════════════════════════════
  async update(tenantId: string, id: string, dto: UpdateGlobalMasterDto) {
    const item = await this.prisma.globalMaster.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!item) {
      throw new NotFoundException('Master value not found.');
    }

    // Edge case: Prevent renaming system defaults (optional strict rule)
    if (item.isSystem && dto.value && dto.value !== item.value) {
      throw new BadRequestException(
        'System default values cannot be renamed. You can only toggle active status.',
      );
    }

    // Check duplicate if value is being changed
    if (dto.value && dto.value !== item.value) {
      const duplicate = await this.prisma.globalMaster.findFirst({
        where: {
          tenantId,
          type: item.type,
          value: { equals: dto.value, mode: 'insensitive' },
          deletedAt: null,
          NOT: { id },
        },
      });

      if (duplicate) {
        throw new ConflictException(`Value '${dto.value}' already exists.`);
      }
    }

    return this.prisma.globalMaster.update({
      where: { id },
      data: dto,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // 6. DELETE — Soft delete only
  // ═══════════════════════════════════════════════════════════════
  async remove(tenantId: string, id: string) {
    const item = await this.prisma.globalMaster.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!item) {
      throw new NotFoundException('Master value not found.');
    }

    // Protect system defaults
    if (item.isSystem) {
      throw new BadRequestException(
        'System default values cannot be deleted. You may deactivate them instead.',
      );
    }

    // TODO: When Panel Master is built, add usage check here:
    // e.g., check if this value is used in any Panel record. If yes, block deletion.

    await this.prisma.globalMaster.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    return { message: `Master value '${item.value}' deleted successfully.` };
  }

  // ═══════════════════════════════════════════════════════════════
  // 7. BULK REORDER — Drag & drop UI support
  // ═══════════════════════════════════════════════════════════════
  async reorder(
    tenantId: string,
    type: MasterValueType,
    orderedIds: string[],
  ) {
    if (!orderedIds?.length) {
      throw new BadRequestException('orderedIds array is required.');
    }

    // Verify all IDs belong to this tenant and type
    const items = await this.prisma.globalMaster.findMany({
      where: { id: { in: orderedIds }, tenantId, type, deletedAt: null },
      select: { id: true },
    });

    if (items.length !== orderedIds.length) {
      throw new BadRequestException(
        'One or more IDs are invalid or do not belong to this master type.',
      );
    }

    // Use transaction for atomic reorder
    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.globalMaster.update({
          where: { id },
          data: { sortOrder: index + 1 },
        }),
      ),
    );

    return { message: 'Reordered successfully.' };
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPER: Validate category vs type mapping
  // ═══════════════════════════════════════════════════════════════
  private validateCategoryTypeMapping(
    category: string,
    type: MasterValueType,
  ): void {
    const mapping: Record<string, MasterValueType[]> = {
      PANEL_BILLING: this.PANEL_BILLING_ORDER,
      CLINICAL: this.CLINICAL_ORDER,
      INVENTORY: [],
      GENERAL: [],
    };

    const allowedTypes = mapping[category];
    if (allowedTypes && allowedTypes.length && !allowedTypes.includes(type)) {
      throw new BadRequestException(
        `Type '${type}' does not belong to category '${category}'.`,
      );
    }
  }
}