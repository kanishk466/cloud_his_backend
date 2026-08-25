import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { Patient, Prisma } from '@prisma/client';
import { SearchPatientDto } from './dto/search-patient.dto';
import { UHID_CONFIG, PATIENT_ERRORS } from './constants/patients.constants';
import { TZDate } from '@date-fns/tz';
import { format } from 'date-fns';

export interface CreatePatientData {
  tenantId: string;
  uhid: string;
  firstName: string;
  lastName?: string;
  gender: string;
  dateOfBirth?: Date;
  age?: number;
  ageUnit?: string;
  bloodGroup?: string;
  maritalStatus?: string;
  mobile: string;
  alternateMobile?: string;
  email?: string;
  address?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
  aadhaarNumber?: string;
  abhaId?: string;
  guardianName?: string;
  guardianRelation?: string;
  guardianMobile?: string;
  insuranceProvider?: string;
  insurancePolicyNo?: string;
  insuranceValidTill?: Date;
  allergies?: string;
  chronicDiseases?: string;
  registeredBy?: string;
}

export interface SearchResult {
  patients: Patient[];
  total: number;
}

@Injectable()
export class PatientsRepository {
  private readonly logger = new Logger(PatientsRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── 1. ATOMIC UHID GENERATOR ────────────────────────────────────
  /**
   * Generates a unique, collision-proof UHID: UHID-YYYY-000001
   * Guaranteed safe across concurrent registrations.
   */
  async generateUhid(
    tenantId: string,
    txClient?: Prisma.TransactionClient,
    timezone: string = 'Asia/Kolkata',
  ): Promise<string> {
    const prisma = txClient || this.prisma;

    try {
      // 1. Calculate the yearly scope key in the hospital's local timezone
      const localTime = new TZDate(new Date(), timezone);
      const currentYear = format(localTime, 'yyyy'); // e.g. "2026"
      const entityType = 'UHID';

      // 2. Perform atomic UPSERT and increment
      const result = await prisma.$queryRaw<Array<{ next_val: number }>>`
        INSERT INTO "tenant_sequences" (
          "id", "tenant_id", "entity_type", "scope_key", "last_value", "updated_at"
        )
        VALUES (
          gen_random_uuid(), ${tenantId}, ${entityType}, ${currentYear}, 1, NOW()
        )
        ON CONFLICT ("tenant_id", "entity_type", "scope_key")
        DO UPDATE SET
          "last_value" = "tenant_sequences"."last_value" + 1,
          "updated_at" = NOW()
        RETURNING "last_value" AS next_val;
      `;

      const sequence = result[0]?.next_val;
      if (!sequence) {
        throw new Error('Database did not return a valid sequence value');
      }

      const paddedSeq = sequence
        .toString()
        .padStart(UHID_CONFIG.SEQUENCE_LENGTH || 6, '0');

      const prefix = UHID_CONFIG.YEARLY_RESET
        ? `${UHID_CONFIG.PREFIX || 'UHID'}-${currentYear}-`
        : `${UHID_CONFIG.PREFIX || 'UHID'}-`;

      return `${prefix}${paddedSeq}`;
      // Output: UHID-2026-000001
    } catch (error) {
      this.logger.error(
        `UHID generation failed for tenant ${tenantId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        PATIENT_ERRORS.UHID_GENERATION_FAILED,
      );
    }
  }

  // ─── 2. CREATE PATIENT ───────────────────────────────────────────
  async create(
    data: CreatePatientData,
    txClient?: Prisma.TransactionClient,
  ): Promise<Patient> {
    const prisma = txClient || this.prisma;

    return prisma.patient.create({
      data: {
        tenantId: data.tenantId,
        uhid: data.uhid,
        firstName: data.firstName,
        lastName: data.lastName,
        gender: data.gender as any,
        dateOfBirth: data.dateOfBirth,
        age: data.age,
        ageUnit: data.ageUnit ?? 'years',
        bloodGroup: data.bloodGroup as any,
        maritalStatus: data.maritalStatus as any,
        mobile: data.mobile,
        alternateMobile: data.alternateMobile,
        email: data.email,
        address: data.address,
        city: data.city,
        district: data.district,
        state: data.state,
        pincode: data.pincode,
        aadhaarNumber: data.aadhaarNumber,
        abhaId: data.abhaId,
        guardianName: data.guardianName,
        guardianRelation: data.guardianRelation as any,
        guardianMobile: data.guardianMobile,
        insuranceProvider: data.insuranceProvider,
        insurancePolicyNo: data.insurancePolicyNo,
        insuranceValidTill: data.insuranceValidTill,
        allergies: data.allergies,
        chronicDiseases: data.chronicDiseases,
        registeredBy: data.registeredBy,
      },
    });
  }

  // ─── 3. FIND BY MOBILE ───────────────────────────────────────────
  async findByMobile(tenantId: string, mobile: string): Promise<Patient | null> {
    return this.prisma.patient.findFirst({
      where: { tenantId, mobile, deletedAt: null },
    });
  }

  // ─── 4. FIND BY ID ───────────────────────────────────────────────
  async findById(tenantId: string, id: string): Promise<Patient | null> {
    return this.prisma.patient.findFirst({
      where: { tenantId, id, deletedAt: null },
    });
  }

  // ─── 5. FIND BY UHID ─────────────────────────────────────────────
  async findByUhid(tenantId: string, uhid: string): Promise<Patient | null> {
    return this.prisma.patient.findFirst({
      where: { tenantId, uhid, deletedAt: null },
    });
  }

  // ─── 6. SEARCH PATIENTS ──────────────────────────────────────────
  async search(tenantId: string, dto: SearchPatientDto): Promise<SearchResult> {
    const {
      search,
      mobile,
      uhid,
      aadhaarNumber,
      status,
      page = 1,
      limit = 20,
    } = dto;

    const where: Prisma.PatientWhereInput = {
      tenantId,
      deletedAt: null,
    };

    if (uhid) {
      where.uhid = uhid;
    } else if (mobile) {
      where.mobile = mobile;
    } else if (aadhaarNumber) {
      where.aadhaarNumber = aadhaarNumber;
    } else if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { uhid: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search } },
      ];
    }

    if (status) {
      where.status = status as any;
    }

    const skip = (page - 1) * limit;

    const [patients, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        orderBy: { registeredAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.patient.count({ where }),
    ]);

    return { patients, total };
  }

  // ─── 7. UPDATE PATIENT (TENANT ISOLATED) ─────────────────────────
  async update(
    tenantId: string,
    id: string,
    data: Partial<CreatePatientData>,
    txClient?: Prisma.TransactionClient,
  ): Promise<Patient> {
    const prisma = txClient || this.prisma;

    const patient = await prisma.patient.findFirstOrThrow({
      where: { tenantId, id },
      select: { uhid: true },
    });

    return prisma.patient.update({
      where: {
        tenantId_uhid: { tenantId, uhid: patient.uhid },
      },
      data: {
        ...data,
        gender: data.gender ? (data.gender as any) : undefined,
        bloodGroup: data.bloodGroup ? (data.bloodGroup as any) : undefined,
        maritalStatus: data.maritalStatus ? (data.maritalStatus as any) : undefined,
        guardianRelation: data.guardianRelation ? (data.guardianRelation as any) : undefined,
      },
    });
  }

  // ─── 8. GET VISIT HISTORY ────────────────────────────────────────
  async getVisitHistory(
    tenantId: string,
    patientId: string,
    page: number,
    limit: number,
  ) {
    const skip = (page - 1) * limit;

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where: {
          tenantId,
          patientId,
          status: 'COMPLETED',
        },
        include: {
          doctorProfile: {
            include: {
              hospitalUser: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          consultation: {
            select: {
              id: true,
              consultationNo: true,
              finalDiagnosis: true,
              completedAt: true,
            },
          },
        },
        orderBy: { appointmentDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.appointment.count({
        where: { tenantId, patientId, status: 'COMPLETED' },
      }),
    ]);

    return { appointments, total };
  }

  // ─── 9. CHECK AADHAAR DUPLICATE ─────────────────────────────────
  async findByAadhaar(
    tenantId: string,
    aadhaarNumber: string,
    excludeId?: string,
  ): Promise<Patient | null> {
    return this.prisma.patient.findFirst({
      where: {
        tenantId,
        aadhaarNumber,
        deletedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
  }
}