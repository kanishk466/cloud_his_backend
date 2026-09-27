import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PatientsRepository } from './patients.repository';
import { PrismaService } from '../../../shared/prisma/prisma.service';

import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { SearchPatientDto } from './dto/search-patient.dto';
import {
  PatientResponseDto,
  PatientListResponseDto,
} from './dto/patient-response.dto';
import { PATIENT_ERRORS } from './constants/patients.constants';

@Injectable()
export class PatientsService {
  private readonly logger = new Logger(PatientsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly patientsRepository: PatientsRepository,
  ) {}

  // ─── REGISTER NEW PATIENT ────────────────────────────────────────
  async register(
    tenantId: string,
    dto: CreatePatientDto,
    registeredByUserId: string,
  ) {
    const existingPatient = await this.patientsRepository.findByMobile(
      tenantId,
      dto.mobile,
    );
    if (existingPatient && existingPatient.length > 0) {
      throw new ConflictException({
        code: 'PATIENT_MOBILE_EXISTS',
        message: 'A patient with this mobile number already exists',
      });
    }

    if (dto.aadhaarNumber) {
      const existingAadhaar = await this.patientsRepository.findByAadhaar(
        tenantId,
        dto.aadhaarNumber,
      );
      if (existingAadhaar) {
        throw new ConflictException({
          code: 'PATIENT_AADHAAR_EXISTS',
          message: 'A patient with this Aadhaar number already exists',
        });
      }
    }

    return await this.prisma.$transaction(async (tx) => {
      const uhid = await this.patientsRepository.generateUhid(tenantId, tx);

      // 🛠️ FIX: Destructure date strings from dto so they don't overwrite parsed Date objects
      const {
        insuranceValidTill,
        panelValidTill,
        dateOfBirth,
        ...restDto
      } = dto as any;

      const validTillString = panelValidTill || insuranceValidTill;

      const patient = await this.patientsRepository.create(
        {
          ...restDto,
          tenantId,
          uhid,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
          panelValidTill: validTillString ? new Date(validTillString) : undefined,
          insuranceValidTill: validTillString ? new Date(validTillString) : undefined,
          registeredBy: registeredByUserId,
        },
        tx,
      );

      return patient;
    });
  }

  // ─── SEARCH PATIENTS ─────────────────────────────────────────────
  async search(
    tenantId: string,
    dto: SearchPatientDto,
  ): Promise<PatientListResponseDto> {
    const { patients, total } = await this.patientsRepository.search(tenantId, dto);

    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;

    return {
      data: patients.map((p) => PatientResponseDto.fromEntity(p)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─── GET PATIENT BY ID ───────────────────────────────────────────
  async findById(tenantId: string, id: string): Promise<PatientResponseDto> {
    const patient = await this.patientsRepository.findById(tenantId, id);

    if (!patient) {
      throw new NotFoundException(PATIENT_ERRORS.NOT_FOUND);
    }

    if (patient.tenantId !== tenantId) {
      throw new ForbiddenException(PATIENT_ERRORS.INVALID_TENANT);
    }

    return PatientResponseDto.fromEntity(patient);
  }

  // ─── GET PATIENT BY UHID ─────────────────────────────────────────
  async findByUhid(tenantId: string, uhid: string): Promise<PatientResponseDto> {
    const patient = await this.patientsRepository.findByUhid(tenantId, uhid);

    if (!patient) {
      throw new NotFoundException({
        ...PATIENT_ERRORS.NOT_FOUND,
        details: { uhid },
      });
    }

    return PatientResponseDto.fromEntity(patient);
  }

  // ─── UPDATE PATIENT ──────────────────────────────────────────────
  async update(
    tenantId: string,
    id: string,
    dto: UpdatePatientDto,
  ): Promise<PatientResponseDto> {
    const existing = await this.patientsRepository.findById(tenantId, id);

    if (!existing) {
      throw new NotFoundException(PATIENT_ERRORS.NOT_FOUND);
    }

    if (dto.aadhaarNumber) {
      const aadhaarExists = await this.patientsRepository.findByAadhaar(
        tenantId,
        dto.aadhaarNumber,
        id,
      );

      if (aadhaarExists) {
        throw new ConflictException({
          code: 'OPD_001',
          message: 'Another patient already has this Aadhaar number',
        });
      }
    }

    let age = (dto as any).age;
    let ageUnit = dto.ageUnit;

    if (dto.dateOfBirth && !age) {
      const calculated = this.calculateAge(new Date(dto.dateOfBirth));
      age = calculated.age;
      ageUnit = calculated.unit;
    }

    // 🛠️ FIX: Extract date strings so they don't override parsed Date objects
    const {
      insuranceValidTill,
      panelValidTill,
      dateOfBirth,
      ...restDto
    } = dto as any;

    const validTillString = panelValidTill || insuranceValidTill;

    const updated = await this.patientsRepository.update(tenantId, id, {
      ...restDto,
      ageAtRegistration: age,
      ageUnit,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      panelValidTill: validTillString ? new Date(validTillString) : undefined,
      insuranceValidTill: validTillString ? new Date(validTillString) : undefined,
    });

    return PatientResponseDto.fromEntity(updated);
  }

  // ─── GET VISIT HISTORY ───────────────────────────────────────────
  async getVisitHistory(
    tenantId: string,
    patientId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const patient = await this.patientsRepository.findById(tenantId, patientId);

    if (!patient) {
      throw new NotFoundException(PATIENT_ERRORS.NOT_FOUND);
    }

    const { appointments, total } = await this.patientsRepository.getVisitHistory(
      tenantId,
      patientId,
      page,
      limit,
    );

    return {
      data: appointments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─── PRIVATE: AGE CALCULATION ─────────────────────────────────────
  private calculateAge(dob: Date): { age: number; unit: string } {
    const now = new Date();
    const diffMs = now.getTime() - dob.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 30) {
      return { age: diffDays, unit: 'days' };
    } else if (diffDays < 365) {
      return { age: Math.floor(diffDays / 30), unit: 'months' };
    } else {
      return { age: Math.floor(diffDays / 365), unit: 'years' };
    }
  }
}