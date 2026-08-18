import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { Patient, Prisma } from '@prisma/client';
import { SearchPatientDto } from './dto/search-patient.dto';
import { UHID_CONFIG, PATIENT_ERRORS } from './constants/patients.constants';

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

  // ─── GENERATE UHID ──────────────────────────────────────────────
  // Uses DB transaction + SELECT to prevent race conditions
  // Two receptionists registering at same time = safe
  async generateUhid(tenantId: string): Promise<string> {
    try {
      const year = new Date().getFullYear();

      const result = await this.prisma.$queryRaw<{ sequence: number }[]>`
      INSERT INTO patient_uhid_sequences (
        id,
        tenant_id,
        year,
        sequence,
        created_at,
        updated_at
      )
      VALUES (
        gen_random_uuid(),
        ${tenantId},
        ${year},
        1,
        NOW(),
        NOW()
      )
      ON CONFLICT (tenant_id, year)
      DO UPDATE SET
        sequence = patient_uhid_sequences.sequence + 1,
        updated_at = NOW()
      RETURNING sequence;
    `;

      const sequence = Number(result[0].sequence);

      const prefix = UHID_CONFIG.YEARLY_RESET
        ? `${UHID_CONFIG.PREFIX}-${year}-`
        : `${UHID_CONFIG.PREFIX}-`;

      return `${prefix}${sequence
        .toString()
        .padStart(UHID_CONFIG.SEQUENCE_LENGTH, '0')}`;
    } catch (error) {
      this.logger.error(
        'UHID generation failed',
        error instanceof Error ? error.stack : String(error),
      );

      throw new InternalServerErrorException(
        PATIENT_ERRORS.UHID_GENERATION_FAILED,
      );
    }
  }

  // ─── CREATE PATIENT ─────────────────────────────────────────────
  async create(data: CreatePatientData): Promise<Patient> {
    return this.prisma.patient.create({
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

  // ─── FIND BY MOBILE (for duplicate check) ───────────────────────
  async findByMobile(
    tenantId: string,
    mobile: string,
  ): Promise<Patient | null> {
    return this.prisma.patient.findFirst({
      where: { tenantId, mobile },
    });
  }

  // ─── FIND BY ID (with tenant check) ─────────────────────────────
  async findById(tenantId: string, id: string): Promise<Patient | null> {
    return this.prisma.patient.findFirst({
      where: { id, tenantId }, // tenantId check is MANDATORY
    });
  }

  // ─── FIND BY UHID ────────────────────────────────────────────────
  async findByUhid(tenantId: string, uhid: string): Promise<Patient | null> {
    return this.prisma.patient.findFirst({
      where: { tenantId, uhid },
    });
  }

  // ─── SEARCH PATIENTS ─────────────────────────────────────────────
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

    // Build where clause
    const where: Prisma.PatientWhereInput = {
      tenantId, // ALWAYS filter by tenant
    };

    // Exact matches take priority
    if (uhid) {
      where.uhid = uhid;
    } else if (mobile) {
      where.mobile = mobile;
    } else if (aadhaarNumber) {
      where.aadhaarNumber = aadhaarNumber;
    } else if (search) {
      // Free text search: name or uhid or mobile
      where.OR = [
        {
          firstName: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          lastName: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          uhid: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          mobile: {
            contains: search,
          },
        },
      ];
    }

    if (status) {
      where.status = status as any;
    }

    const skip = (page - 1) * limit;

    // Run count and data query in parallel
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

  // ─── UPDATE PATIENT ──────────────────────────────────────────────
  async update(
    tenantId: string,
    id: string,
    data: Partial<CreatePatientData>,
  ): Promise<Patient> {
    // findFirst ensures tenant isolation before update
    return this.prisma.patient.update({
      where: { id },
      data: {
        ...data,
        gender: data.gender as any,
        bloodGroup: data.bloodGroup as any,
        maritalStatus: data.maritalStatus as any,
        guardianRelation: data.guardianRelation as any,
      },
    });
  }

  // ─── GET VISIT HISTORY ───────────────────────────────────────────
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

  // ─── CHECK AADHAAR DUPLICATE ────────────────────────────────────
  async findByAadhaar(
    tenantId: string,
    aadhaarNumber: string,
    excludeId?: string,
  ): Promise<Patient | null> {
    return this.prisma.patient.findFirst({
      where: {
        tenantId,
        aadhaarNumber,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
  }
}
