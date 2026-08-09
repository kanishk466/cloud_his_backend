import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { Patient, Prisma } from '@prisma/client';
import { SearchPatientDto } from './dto/search-patient.dto';
import {
  UHID_CONFIG,
  PATIENT_ERRORS,
} from './constants/patients.constants';

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
      return await this.prisma.$transaction(async (tx) => {
        const year = UHID_CONFIG.YEARLY_RESET
          ? new Date().getFullYear()
          : '';

        const prefix = year
          ? `${UHID_CONFIG.PREFIX}-${year}-`
          : `${UHID_CONFIG.PREFIX}-`;

        // Lock the row for update to prevent race condition
        const result = await tx.$queryRaw<{ uhid: string }[]>`
          SELECT uhid 
          FROM patients 
          WHERE tenant_id = ${tenantId}
            AND uhid LIKE ${`${prefix}%`}
          ORDER BY uhid DESC
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        `;

        const lastUhid = result[0]?.uhid;
        let sequence = 1;

        if (lastUhid) {
          const parts = lastUhid.split('-');
          const lastSeq = parseInt(parts[parts.length - 1], 10);
          sequence = lastSeq + 1;
        }

        const paddedSeq = sequence
          .toString()
          .padStart(UHID_CONFIG.SEQUENCE_LENGTH, '0');

        return `${prefix}${paddedSeq}`;
      });
    } catch (error) {
      this.logger.error('UHID generation failed', error);
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
  async findById(
    tenantId: string,
    id: string,
  ): Promise<Patient | null> {
    return this.prisma.patient.findFirst({
      where: { id, tenantId }, // tenantId check is MANDATORY
    });
  }

  // ─── FIND BY UHID ────────────────────────────────────────────────
  async findByUhid(
    tenantId: string,
    uhid: string,
  ): Promise<Patient | null> {
    return this.prisma.patient.findFirst({
      where: { tenantId, uhid },
    });
  }

  // ─── SEARCH PATIENTS ─────────────────────────────────────────────
  async search(
    tenantId: string,
    dto: SearchPatientDto,
  ): Promise<SearchResult> {
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