import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DoctorVisitConfigsRepository } from '../repositories/doctor-visit-configs.repository';
import { CreateVisitConfigDto } from '../dto/visit-config/create-visit-config.dto';
import { UpdateVisitConfigDto } from '../dto/visit-config/update-visit-config.dto';
import { CalculateVisitFeeDto } from '../dto/visit-config/calculate-visit-fee.dto';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class DoctorVisitConfigsService {
  constructor(private readonly repo: DoctorVisitConfigsRepository) {}

  // ─── Upsert (general config when panelId omitted, else panel-specific) ────
  //
  // NOTE: Postgres treats NULLs as distinct in unique indexes, so the
  // (tenantId, doctorProfileId, panelId) unique constraint cannot dedupe
  // general (panelId = NULL) configs. The find-then-write below is the
  // real guard — one general config per doctor, one per (doctor, panel).

  async upsert(tenantId: string, dto: CreateVisitConfigDto) {
    const doctor = await this.repo.findDoctorProfile(
      tenantId,
      dto.doctorProfileId,
    );
    if (!doctor) {
      throw new NotFoundException('Doctor profile not found in this hospital');
    }

    if (dto.panelId) {
      const panel = await this.repo.findPanel(tenantId, dto.panelId);
      if (!panel) {
        throw new NotFoundException('Panel not found in this hospital');
      }
    }

    const existing = await this.repo.findByDoctorAndPanel(
      tenantId,
      dto.doctorProfileId,
      dto.panelId,
    );

    try {
      if (existing) {
        const { doctorProfileId, panelId, ...updateData } = dto;
        const config = await this.repo.update(
          tenantId,
          existing.id,
          updateData,
        );
        return { action: 'updated' as const, config };
      }

      const config = await this.repo.create(tenantId, dto);
      return { action: 'created' as const, config };
    } catch (e) {
      this.rethrowConflict(e);
    }
  }

  findAll(tenantId: string, isActive?: boolean) {
    return this.repo.findAll(tenantId, isActive);
  }

  /** General + every panel-specific config for one doctor. */
  async findForDoctor(tenantId: string, doctorProfileId: string) {
    const doctor = await this.repo.findDoctorProfile(tenantId, doctorProfileId);
    if (!doctor) {
      throw new NotFoundException('Doctor profile not found in this hospital');
    }

    const configs = await this.repo.findForDoctor(tenantId, doctorProfileId);
    return {
      doctorProfileId,
      general: configs.find((c) => c.panelId === null) ?? null,
      panelConfigs: configs.filter((c) => c.panelId !== null),
    };
  }

  async findOne(tenantId: string, id: string) {
    const config = await this.repo.findById(tenantId, id);
    if (!config) throw new NotFoundException('Visit config not found');
    return config;
  }

  async update(tenantId: string, id: string, dto: UpdateVisitConfigDto) {
    await this.findOne(tenantId, id);
    return this.repo.update(tenantId, id, dto);
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.repo.softDelete(tenantId, id);
    return { message: 'Visit config deleted successfully' };
  }

  // ─── Follow-up fee helper ──────────────────────────────────────────────────
  //
  // Resolution order: panel-specific config → general config →
  // DoctorProfile.consultationFee (when no config exists at all).
  //
  // isFollowUp = last visit within followUpDays window AND consumed
  // follow-up visits < followUpMaxVisits.

  async calculateVisitFee(tenantId: string, query: CalculateVisitFeeDto) {
    const doctor = await this.repo.findDoctorProfile(
      tenantId,
      query.doctorProfileId,
    );
    if (!doctor) {
      throw new NotFoundException('Doctor profile not found in this hospital');
    }

    let config = query.panelId
      ? await this.repo.findByDoctorAndPanel(
          tenantId,
          query.doctorProfileId,
          query.panelId,
        )
      : null;
    config ??= await this.repo.findByDoctorAndPanel(
      tenantId,
      query.doctorProfileId,
    ); // general fallback

    // No config → fall back to the doctor's flat consultation fee
    if (!config || !config.isActive) {
      return {
        isFollowUp: false,
        consultationFee: Number(doctor.consultationFee),
        source: 'DOCTOR_PROFILE' as const,
      };
    }

    const visitCount = query.visitCount ?? 0;
    let isFollowUp = false;

    if (query.lastVisitDate && config.followUpMaxVisits > 0) {
      const daysSinceLastVisit = Math.floor(
        (Date.now() - new Date(query.lastVisitDate).getTime()) / DAY_MS,
      );
      isFollowUp =
        daysSinceLastVisit >= 0 &&
        daysSinceLastVisit <= config.followUpDays &&
        visitCount < config.followUpMaxVisits;
    }

    return {
      isFollowUp,
      consultationFee: isFollowUp
        ? Number(config.followUpFee)
        : Number(config.firstVisitFee),
      source: config.panelId
        ? ('PANEL_CONFIG' as const)
        : ('GENERAL_CONFIG' as const),
      configId: config.id,
      followUpDays: config.followUpDays,
      followUpMaxVisits: config.followUpMaxVisits,
    };
  }

  private rethrowConflict(e: unknown): never {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      throw new ConflictException(
        'A visit config already exists for this doctor and panel',
      );
    }
    throw e;
  }
}
