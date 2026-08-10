import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PatientsRepository } from './patients.repository';
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
    private readonly patientsRepository: PatientsRepository,
  ) {}

  // ─── REGISTER NEW PATIENT ────────────────────────────────────────
  async register(
    tenantId: string,
    registeredBy: string,
    dto: CreatePatientDto,
  ): Promise<PatientResponseDto> {
    // Rule 1: Check mobile duplicate within tenant
    const existingByMobile =
      await this.patientsRepository.findByMobile(
        tenantId,
        dto.mobile,
      );

    if (existingByMobile) {
      throw new ConflictException({
        ...PATIENT_ERRORS.ALREADY_EXISTS,
        details: {
          existingUhid: existingByMobile.uhid,
          message: `Patient already registered. UHID: ${existingByMobile.uhid}`,
        },
      });
    }

    // Rule 2: Check Aadhaar duplicate (if provided)
    if (dto.aadhaarNumber) {
      const existingByAadhaar =
        await this.patientsRepository.findByAadhaar(
          tenantId,
          dto.aadhaarNumber,
        );

      if (existingByAadhaar) {
        throw new ConflictException({
          code: 'OPD_001',
          message: 'Patient already registered with this Aadhaar number',
          details: {
            existingUhid: existingByAadhaar.uhid,
          },
        });
      }
    }

    // Rule 3: Auto-calculate age if DOB provided
    let age = dto.age;
    let ageUnit = dto.ageUnit ?? 'years';

    if (dto.dateOfBirth && !dto.age) {
      const calculated = this.calculateAge(new Date(dto.dateOfBirth));
      age = calculated.age;
      ageUnit = calculated.unit;
    }

    // Rule 4: Generate UHID (atomic, race-condition safe)
    const uhid =
      await this.patientsRepository.generateUhid(tenantId);

    this.logger.log(
      `Registering patient with UHID: ${uhid} for tenant: ${tenantId}`,
    );

    // Rule 5: Create patient
    const patient = await this.patientsRepository.create({
      tenantId,
      uhid,
      firstName: dto.firstName,
      lastName: dto.lastName,
      gender: dto.gender,
      dateOfBirth: dto.dateOfBirth
        ? new Date(dto.dateOfBirth)
        : undefined,
      age,
      ageUnit,
      bloodGroup: dto.bloodGroup,
      maritalStatus: dto.maritalStatus,
      mobile: dto.mobile,
      alternateMobile: dto.alternateMobile,
      email: dto.email,
      address: dto.address,
      city: dto.city,
      district: dto.district,
      state: dto.state,
      pincode: dto.pincode,
      aadhaarNumber: dto.aadhaarNumber,
      abhaId: dto.abhaId,
      guardianName: dto.guardianName,
      guardianRelation: dto.guardianRelation,
      guardianMobile: dto.guardianMobile,
      insuranceProvider: dto.insuranceProvider,
      insurancePolicyNo: dto.insurancePolicyNo,
      insuranceValidTill: dto.insuranceValidTill
        ? new Date(dto.insuranceValidTill)
        : undefined,
      allergies: dto.allergies,
      chronicDiseases: dto.chronicDiseases,
      registeredBy,
    });

    return PatientResponseDto.fromEntity(patient);
  }

  // ─── SEARCH PATIENTS ─────────────────────────────────────────────
  async search(
    tenantId: string,
    dto: SearchPatientDto,
  ): Promise<PatientListResponseDto> {
    const { patients, total } =
      await this.patientsRepository.search(tenantId, dto);

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
  async findById(
    tenantId: string,
    id: string,
  ): Promise<PatientResponseDto> {
    const patient = await this.patientsRepository.findById(
      tenantId,
      id,
    );

    if (!patient) {
      throw new NotFoundException(PATIENT_ERRORS.NOT_FOUND);
    }

    // Tenant isolation double-check
    if (patient.tenantId !== tenantId) {
      throw new ForbiddenException(PATIENT_ERRORS.INVALID_TENANT);
    }

    return PatientResponseDto.fromEntity(patient);
  }

  // ─── GET PATIENT BY UHID ─────────────────────────────────────────
  async findByUhid(
    tenantId: string,
    uhid: string,
  ): Promise<PatientResponseDto> {
    const patient = await this.patientsRepository.findByUhid(
      tenantId,
      uhid,
    );

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
    // Verify patient exists and belongs to tenant
    const existing = await this.patientsRepository.findById(
      tenantId,
      id,
    );

    if (!existing) {
      throw new NotFoundException(PATIENT_ERRORS.NOT_FOUND);
    }

    // Check Aadhaar duplicate if being updated
    if (dto.aadhaarNumber) {
      const aadhaarExists =
        await this.patientsRepository.findByAadhaar(
          tenantId,
          dto.aadhaarNumber,
          id, // exclude current patient
        );

      if (aadhaarExists) {
        throw new ConflictException({
          code: 'OPD_001',
          message:
            'Another patient already has this Aadhaar number',
        });
      }
    }

    // Recalculate age if DOB updated
    let age = dto.age;
    let ageUnit = dto.ageUnit;

    if (dto.dateOfBirth && !dto.age) {
      const calculated = this.calculateAge(
        new Date(dto.dateOfBirth),
      );
      age = calculated.age;
      ageUnit = calculated.unit;
    }

    const updated = await this.patientsRepository.update(
      tenantId,
      id,
      {
        ...dto,
        age,
        ageUnit,
        dateOfBirth: dto.dateOfBirth
          ? new Date(dto.dateOfBirth)
          : undefined,
        insuranceValidTill: dto.insuranceValidTill
          ? new Date(dto.insuranceValidTill)
          : undefined,
      },
    );

    return PatientResponseDto.fromEntity(updated);
  }

  // ─── GET VISIT HISTORY ───────────────────────────────────────────
  async getVisitHistory(
    tenantId: string,
    patientId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    // Verify patient belongs to tenant
    const patient = await this.patientsRepository.findById(
      tenantId,
      patientId,
    );

    if (!patient) {
      throw new NotFoundException(PATIENT_ERRORS.NOT_FOUND);
    }

    const { appointments, total } =
      await this.patientsRepository.getVisitHistory(
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
      return {
        age: Math.floor(diffDays / 30),
        unit: 'months',
      };
    } else {
      return {
        age: Math.floor(diffDays / 365),
        unit: 'years',
      };
    }
  }
}