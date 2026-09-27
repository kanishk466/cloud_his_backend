import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { Prisma, PatientStatus, Gender, BloodGroup, MaritalStatus, RelationType } from '@prisma/client';

export interface CreatePatientData {
  tenantId: string;
  uhid?: string;
  firstName: string;
  lastName?: string;
  dateOfBirth?: Date;
  ageAtRegistration?: number;
  age?: number;
  ageUnit?: string;
  gender: Gender;
  bloodGroup?: BloodGroup;
  maritalStatus?: MaritalStatus;
  photo?: string;
  mobile: string;
  alternateMobile?: string;
  email?: string;
  address?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
  country?: string;
  aadhaarNumber?: string;
  panNumber?: string;
  abhaId?: string;
  guardianName?: string;
  guardianRelation?: RelationType;
  guardianMobile?: string;
  panelId?: string;
  panelPolicyNo?: string;
  panelValidTill?: Date;
  insuranceValidTill?: Date; // Backward compatibility
  allergies?: string;
  chronicDiseases?: string;
  patientType?: any;
  status?: PatientStatus;
  registeredBy?: string;
  consentToShare?: boolean;
  privacyFlag?: string;
}

export interface UpdatePatientData extends Partial<Omit<CreatePatientData, 'tenantId' | 'uhid'>> {}

@Injectable()
export class PatientsRepository {
  private readonly logger = new Logger(PatientsRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── GENERATE UHID (Transaction-safe) ────────────────────────────
  async generateUhid(tenantId: string, tx?: Prisma.TransactionClient): Promise<string> {
    const client = tx || this.prisma;
    const year = new Date().getFullYear().toString();

    const seq = await client.tenantSequence.upsert({
      where: {
        tenantId_entityType_scopeKey: {
          tenantId,
          entityType: 'UHID',
          scopeKey: year,
        },
      },
      create: { tenantId, entityType: 'UHID', scopeKey: year, lastValue: 1 },
      update: { lastValue: { increment: 1 } },
    });

    return `UHID-${year}-${String(seq.lastValue).padStart(6, '0')}`;
  }

  // ─── CREATE PATIENT ───────────────────────────────────────────────
  async create(data: CreatePatientData, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    const uhid = data.uhid || (await this.generateUhid(data.tenantId, client));

    return client.patient.create({
      data: {
        tenantId: data.tenantId,
        uhid,
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth,
        ageAtRegistration: data.ageAtRegistration ?? data.age,
        ageUnit: data.ageUnit ?? 'years',
        gender: data.gender,
        bloodGroup: data.bloodGroup,
        maritalStatus: data.maritalStatus,
        photo: data.photo,
        mobile: data.mobile,
        alternateMobile: data.alternateMobile,
        email: data.email,
        address: data.address,
        city: data.city,
        district: data.district,
        state: data.state,
        pincode: data.pincode,
        country: data.country ?? 'India',
        aadhaarNumber: data.aadhaarNumber,
        panNumber: data.panNumber,
        abhaId: data.abhaId,
        guardianName: data.guardianName,
        guardianRelation: data.guardianRelation,
        guardianMobile: data.guardianMobile,
        panelId: data.panelId,
        panelPolicyNo: data.panelPolicyNo,
        panelValidTill: data.panelValidTill ?? data.insuranceValidTill,
        allergies: data.allergies,
        chronicDiseases: data.chronicDiseases,
        patientType: data.patientType ?? 'NEW',
        status: data.status ?? PatientStatus.ACTIVE,
        registeredBy: data.registeredBy,
        consentToShare: data.consentToShare ?? true,
        privacyFlag: data.privacyFlag,
      },
      include: {
        panel: {
          select: {
            id: true,
            panelCode: true,
            panelName: true,
          },
        },
      },
    });
  }

  // ─── FIND BY AADHAAR ──────────────────────────────────────────────
  async findByAadhaar(tenantId: string, aadhaarNumber: string, excludePatientId?: string) {
    return this.prisma.patient.findFirst({
      where: {
        tenantId,
        aadhaarNumber,
        deletedAt: null,
        ...(excludePatientId && { NOT: { id: excludePatientId } }),
      },
    });
  }

  // ─── FIND BY ID ───────────────────────────────────────────────────
  async findById(tenantId: string, id: string) {
    return this.prisma.patient.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        panel: {
          select: { id: true, panelCode: true, panelName: true },
        },
        mergedInto: {
          select: { id: true, uhid: true, firstName: true, lastName: true },
        },
      },
    });
  }

  // ─── FIND BY UHID ─────────────────────────────────────────────────
  async findByUhid(tenantId: string, uhid: string) {
    return this.prisma.patient.findFirst({
      where: { tenantId, uhid, deletedAt: null },
      include: { panel: true },
    });
  }

  // ─── FIND BY MOBILE ───────────────────────────────────────────────
  async findByMobile(tenantId: string, mobile: string) {
    return this.prisma.patient.findMany({
      where: { tenantId, mobile, deletedAt: null },
      orderBy: { registeredAt: 'desc' },
    });
  }

  // ─── SEARCH / FIND MANY ──────────────────────────────────────────
  async search(tenantId: string, dto: any) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.PatientWhereInput = {
      tenantId,
      deletedAt: null,
      ...(dto.status && { status: dto.status }),
      ...(dto.search && {
        OR: [
          { firstName: { contains: dto.search, mode: 'insensitive' } },
          { lastName: { contains: dto.search, mode: 'insensitive' } },
          { uhid: { contains: dto.search, mode: 'insensitive' } },
          { mobile: { contains: dto.search, mode: 'insensitive' } },
          { abhaId: { contains: dto.search, mode: 'insensitive' } },
          { aadhaarNumber: { contains: dto.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [patients, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { registeredAt: 'desc' },
        include: {
          panel: { select: { id: true, panelCode: true, panelName: true } },
        },
      }),
      this.prisma.patient.count({ where }),
    ]);

    return { patients, total, page, limit };
  }

  async findMany(tenantId: string, params: any) {
    const res = await this.search(tenantId, params);
    return { data: res.patients, total: res.total, page: res.page, limit: res.limit };
  }

  // ─── UPDATE PATIENT ───────────────────────────────────────────────
  async update(tenantId: string, id: string, data: UpdatePatientData) {
    const ageAtRegistration = data.ageAtRegistration ?? data.age;

    return this.prisma.patient.update({
      where: { id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth,
        ...(ageAtRegistration !== undefined && { ageAtRegistration }),
        ageUnit: data.ageUnit,
        gender: data.gender,
        bloodGroup: data.bloodGroup,
        maritalStatus: data.maritalStatus,
        photo: data.photo,
        mobile: data.mobile,
        alternateMobile: data.alternateMobile,
        email: data.email,
        address: data.address,
        city: data.city,
        district: data.district,
        state: data.state,
        pincode: data.pincode,
        country: data.country,
        aadhaarNumber: data.aadhaarNumber,
        panNumber: data.panNumber,
        abhaId: data.abhaId,
        guardianName: data.guardianName,
        guardianRelation: data.guardianRelation,
        guardianMobile: data.guardianMobile,
        panelId: data.panelId,
        panelPolicyNo: data.panelPolicyNo,
        panelValidTill: data.panelValidTill ?? data.insuranceValidTill,
        allergies: data.allergies,
        chronicDiseases: data.chronicDiseases,
        status: data.status,
        consentToShare: data.consentToShare,
        privacyFlag: data.privacyFlag,
      },
      include: { panel: true },
    });
  }

  // ─── GET VISIT HISTORY ────────────────────────────────────────────
  async getVisitHistory(tenantId: string, patientId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where: { tenantId, patientId, deletedAt: null },
        skip,
        take: limit,
        orderBy: { appointmentDate: 'desc' },
        include: {
          doctorProfile: {
            select: {
              specialization: true,
              hospitalUser: { select: { firstName: true, lastName: true } },
            },
          },
          department: { select: { name: true } },
        },
      }),
      this.prisma.appointment.count({ where: { tenantId, patientId, deletedAt: null } }),
    ]);

    return { appointments, total };
  }

  // ─── SOFT DELETE ──────────────────────────────────────────────────
  async softDelete(tenantId: string, id: string) {
    return this.prisma.patient.update({
      where: { id },
      data: { deletedAt: new Date(), status: PatientStatus.INACTIVE },
    });
  }
}