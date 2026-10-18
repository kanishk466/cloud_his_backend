import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { Gender, Prisma, ServiceItemType } from '@prisma/client';
import csv from 'csv-parser';
import * as ExcelJS from 'exceljs';
import { Readable } from 'stream';

export type ImportFileType = 'csv' | 'xlsx';
export type DuplicateStrategy = 'skip' | 'update';

export interface ImportSummary {
  totalRows: number;
  imported: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; reason: string }>;
}

interface ParsedRow {
  serviceCode?: string;
  serviceName?: string;
  categoryCode?: string;
  subCategoryCode?: string;
  baseRate?: string;
  itemType?: string;
  hsnSacCode?: string;
  uom?: string;
  rateEditable?: string;
  discountable?: string;
  genderRestriction?: string;
  minAgeYears?: string;
  maxAgeYears?: string;
}

const BATCH_SIZE = 100;

/**
 * Phase 2.1B — Bulk Import of Service Items (CSV / Excel).
 *
 * Hospitals onboard with 500–2000 services in a spreadsheet. This service
 * parses the file, resolves category/sub-category codes against the tenant's
 * masters, dedupes serviceCodes and inserts in batches of 100 inside a
 * single transaction.
 */
@Injectable()
export class BulkImportService {
  private readonly logger = new Logger(BulkImportService.name);

  constructor(private readonly prisma: PrismaService) {}

  async importServicesFromFile(
    tenantId: string,
    fileBuffer: Buffer,
    fileType: ImportFileType,
    options: { duplicateStrategy?: DuplicateStrategy } = {},
  ): Promise<ImportSummary> {
    const duplicateStrategy = options.duplicateStrategy ?? 'skip';

    // ─── 1. Parse file ─────────────────────────────────────────────────────
    const rows =
      fileType === 'csv'
        ? await this.parseCsv(fileBuffer)
        : await this.parseXlsx(fileBuffer);

    const summary: ImportSummary = {
      totalRows: rows.length,
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    if (rows.length === 0) {
      throw new BadRequestException('The uploaded file contains no data rows');
    }

    // ─── 2. Pre-load tenant lookup maps (1 query each, not per row) ────────
    const [categories, subCategories, existingServices] = await Promise.all([
      this.prisma.serviceCategoryMaster.findMany({
        where: { tenantId, deletedAt: null },
        select: { id: true, code: true },
      }),
      this.prisma.serviceSubCategory.findMany({
        where: { tenantId, deletedAt: null },
        select: { id: true, code: true, categoryId: true },
      }),
      this.prisma.serviceMaster.findMany({
        where: { tenantId, deletedAt: null },
        select: { id: true, serviceCode: true },
      }),
    ]);

    const categoryByCode = new Map(categories.map((c) => [c.code, c.id]));
    const subCategoryByCode = new Map(
      subCategories.map((s) => [
        s.code,
        { id: s.id, categoryId: s.categoryId },
      ]),
    );
    const existingByCode = new Map(
      existingServices.map((s) => [s.serviceCode, s.id]),
    );

    // Track codes seen in THIS file to catch intra-file duplicates
    const seenInFile = new Set<string>();

    // ─── 3. Validate + normalize each row ──────────────────────────────────
    const toInsert: Prisma.ServiceMasterCreateManyInput[] = [];
    const toUpdate: Array<{
      id: string;
      data: Prisma.ServiceMasterUpdateInput;
    }> = [];

    rows.forEach((raw, index) => {
      const rowNo = index + 2; // +1 for header, +1 for 1-based display
      const fail = (reason: string) =>
        summary.errors.push({ row: rowNo, reason });

      const serviceCode = raw.serviceCode?.trim().toUpperCase();
      const serviceName = raw.serviceName?.trim();
      const categoryCode = raw.categoryCode?.trim().toUpperCase();
      const subCategoryCode = raw.subCategoryCode?.trim().toUpperCase();

      // Required fields
      if (!serviceCode) return fail('serviceCode is required');
      if (!serviceName) return fail('serviceName is required');
      if (!categoryCode) return fail('categoryCode is required');

      const baseRate = Number(raw.baseRate);
      if (
        raw.baseRate == null ||
        raw.baseRate === '' ||
        Number.isNaN(baseRate) ||
        baseRate < 0
      ) {
        return fail('baseRate must be a non-negative number');
      }

      // Category lookup
      const categoryId = categoryByCode.get(categoryCode);
      if (!categoryId) return fail(`Unknown categoryCode '${categoryCode}'`);

      // Sub-category lookup (optional) + hierarchy consistency
      let subCategoryId: string | undefined;
      if (subCategoryCode) {
        const sub = subCategoryByCode.get(subCategoryCode);
        if (!sub) return fail(`Unknown subCategoryCode '${subCategoryCode}'`);
        if (sub.categoryId !== categoryId) {
          return fail(
            `subCategoryCode '${subCategoryCode}' does not belong to category '${categoryCode}'`,
          );
        }
        subCategoryId = sub.id;
      }

      // Enum parsing
      const itemType = this.parseEnum(
        raw.itemType,
        ServiceItemType,
        ServiceItemType.BOTH,
      );
      if (itemType === null) return fail(`Invalid itemType '${raw.itemType}'`);

      const genderRestriction = this.parseEnum(raw.genderRestriction, Gender);
      if (genderRestriction === null) {
        return fail(`Invalid genderRestriction '${raw.genderRestriction}'`);
      }

      // Boolean parsing
      const rateEditable = this.parseBool(raw.rateEditable, false);
      if (rateEditable === null) {
        return fail(
          `Invalid rateEditable '${raw.rateEditable}' (use true/false)`,
        );
      }
      const discountable = this.parseBool(raw.discountable, true);
      if (discountable === null) {
        return fail(
          `Invalid discountable '${raw.discountable}' (use true/false)`,
        );
      }

      // Optional integers + range sanity
      const minAgeYears = this.parseInt(raw.minAgeYears);
      if (minAgeYears === null)
        return fail(`Invalid minAgeYears '${raw.minAgeYears}'`);
      const maxAgeYears = this.parseInt(raw.maxAgeYears);
      if (maxAgeYears === null)
        return fail(`Invalid maxAgeYears '${raw.maxAgeYears}'`);
      if (
        minAgeYears !== undefined &&
        maxAgeYears !== undefined &&
        minAgeYears > maxAgeYears
      ) {
        return fail('minAgeYears cannot be greater than maxAgeYears');
      }

      // Duplicate handling — within file and within tenant
      if (seenInFile.has(serviceCode)) {
        return fail(`Duplicate serviceCode '${serviceCode}' within the file`);
      }
      seenInFile.add(serviceCode);

      const baseData = {
        serviceName,
        baseRate,
        categoryId,
        subCategoryId,
        itemType,
        hsnSacCode: raw.hsnSacCode?.trim() || undefined,
        uom: raw.uom?.trim() || 'Per Unit',
        rateEditable,
        discountable,
        genderRestriction: genderRestriction ?? undefined,
        minAgeYears,
        maxAgeYears,
      };

      const existingId = existingByCode.get(serviceCode);
      if (existingId) {
        if (duplicateStrategy === 'update') {
          toUpdate.push({ id: existingId, data: baseData });
        } else {
          summary.skipped++;
        }
        return;
      }

      toInsert.push({ tenantId, serviceCode, ...baseData });
    });

    // ─── 4. Write in one transaction, batched createMany (100/chunk) ───────
    // Generous timeout: 2000 rows ≈ 20 batches + updates on a remote pooler.
    await this.prisma.$transaction(
      async (tx) => {
        for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
          const chunk = toInsert.slice(i, i + BATCH_SIZE);
          const result = await tx.serviceMaster.createMany({
            data: chunk,
            skipDuplicates: true,
          });
          summary.imported += result.count;
        }

        for (const { id, data } of toUpdate) {
          await tx.serviceMaster.update({ where: { id }, data });
          summary.updated++;
        }
      },
      { timeout: 120000 },
    );

    this.logger.log(
      `Bulk import for tenant ${tenantId}: ${summary.imported} imported, ${summary.updated} updated, ${summary.skipped} skipped, ${summary.errors.length} errors`,
    );

    return summary;
  }

  // ─── CSV parsing ────────────────────────────────────────────────────────────

  private parseCsv(buffer: Buffer): Promise<ParsedRow[]> {
    return new Promise((resolve, reject) => {
      const rows: ParsedRow[] = [];
      Readable.from(buffer)
        .pipe(
          csv({
            mapHeaders: ({ header }) => header.trim(),
            mapValues: ({ value }) =>
              typeof value === 'string' ? value.trim() : value,
          }),
        )
        .on('data', (row: ParsedRow) => rows.push(row))
        .on('end', () => resolve(rows))
        .on('error', reject);
    });
  }

  // ─── XLSX parsing (first worksheet, first row = headers) ────────────────────

  private async parseXlsx(buffer: Buffer): Promise<ParsedRow[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

    const sheet = workbook.worksheets[0];
    if (!sheet) {
      throw new BadRequestException('The Excel file contains no worksheets');
    }

    const headers: string[] = [];
    const rows: ParsedRow[] = [];

    sheet.eachRow((row, rowNumber) => {
      const values = row.values as ExcelJS.CellValue[];
      if (rowNumber === 1) {
        values.forEach((v) => headers.push(String(v ?? '').trim()));
        return;
      }
      const record: Record<string, string> = {};
      headers.forEach((header, i) => {
        if (!header) return;
        const cell = values[i];
        record[header] =
          cell == null
            ? ''
            : typeof cell === 'object' && 'text' in (cell as any)
              ? String((cell as any).text).trim()
              : String(cell).trim();
      });
      // Skip completely empty rows
      if (Object.values(record).some((v) => v !== '')) {
        rows.push(record as ParsedRow);
      }
    });

    return rows;
  }

  // ─── Value parsers ──────────────────────────────────────────────────────────

  /** undefined = absent (use fallback), null = invalid value */
  private parseEnum<T extends Record<string, string>>(
    raw: string | undefined,
    enumObj: T,
    fallback?: T[keyof T],
  ): T[keyof T] | undefined | null {
    if (raw == null || raw.trim() === '') return fallback;
    const value = raw.trim().toUpperCase();
    return (Object.values(enumObj) as string[]).includes(value)
      ? (value as T[keyof T])
      : null;
  }

  /** undefined = absent (use fallback), null = invalid value */
  private parseBool(
    raw: string | undefined,
    fallback: boolean,
  ): boolean | null {
    if (raw == null || raw.trim() === '') return fallback;
    const value = raw.trim().toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(value)) return true;
    if (['false', '0', 'no', 'n'].includes(value)) return false;
    return null;
  }

  /** undefined = absent, null = invalid value */
  private parseInt(raw: string | undefined): number | undefined | null {
    if (raw == null || raw.trim() === '') return undefined;
    const num = Number(raw);
    return Number.isInteger(num) && num >= 0 ? num : null;
  }
}
