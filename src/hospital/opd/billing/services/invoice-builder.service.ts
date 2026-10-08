import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { BILLING_ERRORS } from '../constants/billing.constants';

export interface InvoiceLineItem {
  name: string;
  qty: number;
  rate: number;
  amount: number;
}

export interface InvoiceSubCategoryGroup {
  subCategoryName: string;
  printOrder: number;
  items: InvoiceLineItem[];
}

export interface InvoiceCategoryGroup {
  categoryName: string;
  categoryCode: string;
  sortOrder: number;
  subCategories: InvoiceSubCategoryGroup[];
}

const FALLBACK_GROUP = {
  categoryName: 'Other Charges',
  categoryCode: 'OTHER',
  sortOrder: 9999,
};

const FALLBACK_SUB_GROUP = {
  subCategoryName: 'Other Charges',
  printOrder: 9999,
};

/**
 * Phase 2.1B — Invoice Print Grouping.
 *
 * Builds print-ready invoice data: bill items grouped by
 * Category → Sub-Category, ordered by category.sortOrder /
 * subCategory.printOrder / item.createdAt. Items with no service link
 * (or no hierarchy) fall into a trailing "Other Charges" group.
 */
@Injectable()
export class InvoiceBuilderService {
  constructor(private readonly prisma: PrismaService) {}

  async buildInvoiceData(tenantId: string, billId: string) {
    const bill = await this.prisma.opdBill.findFirst({
      where: { id: billId, tenantId },
      include: {
        patient: {
          select: {
            id: true,
            uhid: true,
            firstName: true,
            lastName: true,
            mobile: true,
            gender: true,
            dateOfBirth: true,
          },
        },
        appointment: { select: { id: true, appointmentNo: true } },
        payments: { orderBy: { paidAt: 'asc' as const } },
        items: {
          orderBy: { createdAt: 'asc' as const },
          include: {
            service: {
              include: {
                categoryRel: true,
                subCategoryRel: { include: { category: true } },
              },
            },
          },
        },
      },
    });

    if (!bill) throw new NotFoundException(BILLING_ERRORS.BILL_NOT_FOUND);

    // ─── Group items: Category → SubCategory → items ────────────────────────
    const categoryMap = new Map<
      string,
      {
        group: InvoiceCategoryGroup;
        subMap: Map<string, InvoiceSubCategoryGroup>;
      }
    >();

    for (const item of bill.items) {
      const line: InvoiceLineItem = {
        name: item.itemName,
        qty: item.quantity,
        rate: Number(item.unitPrice),
        amount: Number(item.totalAmount),
      };

      // Resolve hierarchy: sub-category (preferred, implies parent) or direct category
      const subCategory = item.service?.subCategoryRel ?? null;
      const category =
        subCategory?.category ?? item.service?.categoryRel ?? null;

      const categoryKey = category?.id ?? '__OTHER__';
      if (!categoryMap.has(categoryKey)) {
        categoryMap.set(categoryKey, {
          group: {
            categoryName: category?.name ?? FALLBACK_GROUP.categoryName,
            categoryCode: category?.code ?? FALLBACK_GROUP.categoryCode,
            sortOrder: category?.sortOrder ?? FALLBACK_GROUP.sortOrder,
            subCategories: [],
          },
          subMap: new Map<string, InvoiceSubCategoryGroup>(),
        });
      }
      const bucket = categoryMap.get(categoryKey)!;

      const subCategoryKey = subCategory?.id ?? '__OTHER__';
      if (!bucket.subMap.has(subCategoryKey)) {
        bucket.subMap.set(subCategoryKey, {
          subCategoryName:
            subCategory?.displayName ??
            subCategory?.name ??
            FALLBACK_SUB_GROUP.subCategoryName,
          printOrder: subCategory?.printOrder ?? FALLBACK_SUB_GROUP.printOrder,
          items: [],
        });
      }

      bucket.subMap.get(subCategoryKey)!.items.push(line);
    }

    // Flatten nested maps into the response structure
    for (const { group, subMap } of categoryMap.values()) {
      group.subCategories = Array.from(subMap.values());
    }

    // ─── Sort: category.sortOrder → subCategory.printOrder ───────────────────
    const groupedItems = Array.from(categoryMap.values())
      .map(({ group }) => ({
        ...group,
        subCategories: group.subCategories.sort(
          (a, b) => a.printOrder - b.printOrder,
        ),
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);

    return {
      bill: {
        id: bill.id,
        billNo: bill.billNo,
        date: bill.billedAt,
        patientName: [bill.patient.firstName, bill.patient.lastName]
          .filter(Boolean)
          .join(' '),
        patientUhid: bill.patient.uhid,
        patientMobile: bill.patient.mobile,
        patientGender: bill.patient.gender,
        appointmentNo: bill.appointment?.appointmentNo ?? null,
        paymentStatus: bill.paymentStatus,
        billStatus: bill.billStatus,
        discountReason: bill.discountReason,
      },
      groupedItems,
      totals: {
        subtotal: Number(bill.subtotal),
        discount: Number(bill.discountAmount),
        discountPercent: Number(bill.discountPercent),
        tax: Number(bill.taxAmount),
        grandTotal: Number(bill.totalAmount),
        paid: Number(bill.paidAmount),
        due: Number(bill.dueAmount),
      },
    };
  }
}
