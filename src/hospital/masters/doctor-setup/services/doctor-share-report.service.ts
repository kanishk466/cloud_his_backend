import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

export interface ShareReportFilters {
  doctorProfileId?: string;
  departmentId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * Phase 2.2B — Doctor Share Report.
 *
 * Visiting consultants earn a % of their consultation revenue
 * (DoctorProfile.doctorSharePercent). This report aggregates PAID bills
 * linked to appointments per doctor for monthly settlement:
 *   share = grossConsultationRevenue × sharePercent / 100.
 */
@Injectable()
export class DoctorShareReportService {
  constructor(private readonly prisma: PrismaService) {}

  async generateShareReport(tenantId: string, filters: ShareReportFilters) {
    // Defaults: current month-to-date
    const now = new Date();
    const dateFrom =
      filters.dateFrom ?? new Date(now.getFullYear(), now.getMonth(), 1);
    const dateTo = filters.dateTo ?? now;

    const bills = await this.prisma.opdBill.findMany({
      where: {
        tenantId,
        paymentStatus: 'PAID',
        appointmentId: { not: null },
        billedAt: { gte: dateFrom, lte: dateTo },
        ...(filters.doctorProfileId || filters.departmentId
          ? {
              appointment: {
                ...(filters.doctorProfileId
                  ? { doctorProfileId: filters.doctorProfileId }
                  : {}),
                ...(filters.departmentId
                  ? {
                      doctorProfile: {
                        clinicalDepartmentId: filters.departmentId,
                      },
                    }
                  : {}),
              },
            }
          : {}),
      },
      include: {
        appointment: {
          select: {
            consultationFee: true,
            doctorProfile: {
              select: {
                id: true,
                doctorSharePercent: true,
                hospitalUser: {
                  select: { firstName: true, lastName: true },
                },
                clinicalDepartment: { select: { id: true, name: true } },
                specializationRel: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    // ─── Group by doctor ──────────────────────────────────────────────────
    interface DoctorBucket {
      doctorId: string;
      doctorName: string;
      department: string | null;
      departmentId: string | null;
      specialization: string | null;
      totalAppointments: number;
      grossRevenue: number;
      sharePercent: number;
      shareAmount: number;
      hospitalRetained: number;
    }

    const byDoctor = new Map<string, DoctorBucket>();

    for (const bill of bills) {
      const doctor = bill.appointment?.doctorProfile;
      if (!doctor) continue;

      const bucket = byDoctor.get(doctor.id) ?? {
        doctorId: doctor.id,
        doctorName:
          `Dr. ${doctor.hospitalUser.firstName} ${doctor.hospitalUser.lastName ?? ''}`.trim(),
        department: doctor.clinicalDepartment?.name ?? null,
        departmentId: doctor.clinicalDepartment?.id ?? null,
        specialization: doctor.specializationRel?.name ?? null,
        totalAppointments: 0,
        grossRevenue: 0,
        sharePercent: Number(doctor.doctorSharePercent),
        shareAmount: 0,
        hospitalRetained: 0,
      };

      bucket.totalAppointments += 1;
      bucket.grossRevenue += Number(bill.appointment!.consultationFee);
      byDoctor.set(doctor.id, bucket);
    }

    const doctors = Array.from(byDoctor.values()).map((d) => {
      const shareAmount = round2((d.grossRevenue * d.sharePercent) / 100);
      return {
        ...d,
        grossRevenue: round2(d.grossRevenue),
        shareAmount,
        hospitalRetained: round2(d.grossRevenue - shareAmount),
      };
    });

    // ─── Department-wise totals ───────────────────────────────────────────
    const byDepartment = new Map<
      string,
      {
        department: string | null;
        departmentId: string | null;
        grossRevenue: number;
        shareAmount: number;
        hospitalRetained: number;
      }
    >();

    for (const d of doctors) {
      const key = d.departmentId ?? '__NONE__';
      const bucket = byDepartment.get(key) ?? {
        department: d.department ?? 'Unassigned',
        departmentId: d.departmentId,
        grossRevenue: 0,
        shareAmount: 0,
        hospitalRetained: 0,
      };
      bucket.grossRevenue += d.grossRevenue;
      bucket.shareAmount += d.shareAmount;
      bucket.hospitalRetained += d.hospitalRetained;
      byDepartment.set(key, bucket);
    }

    const hospitalTotals = doctors.reduce(
      (acc, d) => ({
        grossRevenue: acc.grossRevenue + d.grossRevenue,
        shareAmount: acc.shareAmount + d.shareAmount,
        hospitalRetained: acc.hospitalRetained + d.hospitalRetained,
        totalAppointments: acc.totalAppointments + d.totalAppointments,
      }),
      {
        grossRevenue: 0,
        shareAmount: 0,
        hospitalRetained: 0,
        totalAppointments: 0,
      },
    );

    return {
      period: { dateFrom, dateTo },
      doctors: doctors.sort((a, b) => b.grossRevenue - a.grossRevenue),
      departmentTotals: Array.from(byDepartment.values()).map((d) => ({
        ...d,
        grossRevenue: round2(d.grossRevenue),
        shareAmount: round2(d.shareAmount),
        hospitalRetained: round2(d.hospitalRetained),
      })),
      hospitalTotals: {
        ...hospitalTotals,
        grossRevenue: round2(hospitalTotals.grossRevenue),
        shareAmount: round2(hospitalTotals.shareAmount),
        hospitalRetained: round2(hospitalTotals.hospitalRetained),
      },
    };
  }
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
