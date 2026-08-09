import { VITALS_NORMAL_RANGES } from '../constants/vitals.constants';

// Flag for abnormal vitals
export interface VitalFlag {
  field: string;
  value: number;
  status: 'NORMAL' | 'LOW' | 'HIGH' | 'CRITICAL';
  normalRange: { min: number; max: number };
}

export class VitalsResponseDto {
  id!: string;
  patientId!: string;
  appointmentId!: string | null;
  consultationId!: string | null;

  // Anthropometry
  heightCm!: number | null;
  weightKg!: number | null;
  bmi!: number | null;
  bmiCategory!: string | null;

  // Temperature
  temperatureF!: number | null;

  // Cardiovascular
  bloodPressureSys!: number | null;
  bloodPressureDia!: number | null;
  bloodPressureFormatted!: string | null; // "120/80 mmHg"
  pulseRate!: number | null;

  // Respiratory
  respiratoryRate!: number | null;
  spo2!: number | null;

  // Blood Sugar
  bloodSugarFasting!: number | null;
  bloodSugarPP!: number | null;
  bloodSugarRandom!: number | null;

  // Pain
  painScore!: number | null;

  // Clinical
  chiefComplaints!: string | null;
  notes!: string | null;

  // Meta
  recordedBy!: string | null;
  recordedAt!: Date;

  // Flags for abnormal values
  flags!: VitalFlag[];

  static fromEntity(entity: any): VitalsResponseDto {
    const dto = new VitalsResponseDto();

    dto.id = entity.id;
    dto.patientId = entity.patientId;
    dto.appointmentId = entity.appointmentId;
    dto.consultationId = entity.consultationId;

    dto.heightCm = entity.heightCm ? Number(entity.heightCm) : null;
    dto.weightKg = entity.weightKg ? Number(entity.weightKg) : null;
    dto.bmi = entity.bmi ? Number(entity.bmi) : null;
    dto.bmiCategory = dto.bmi ? VitalsResponseDto.getBmiCategory(dto.bmi) : null;

    dto.temperatureF = entity.temperatureF ? Number(entity.temperatureF) : null;

    dto.bloodPressureSys = entity.bloodPressureSys;
    dto.bloodPressureDia = entity.bloodPressureDia;
    dto.bloodPressureFormatted =
      entity.bloodPressureSys && entity.bloodPressureDia
        ? `${entity.bloodPressureSys}/${entity.bloodPressureDia} mmHg`
        : null;
    dto.pulseRate = entity.pulseRate;

    dto.respiratoryRate = entity.respiratoryRate;
    dto.spo2 = entity.spo2 ? Number(entity.spo2) : null;

    dto.bloodSugarFasting = entity.bloodSugarFasting ? Number(entity.bloodSugarFasting) : null;
    dto.bloodSugarPP = entity.bloodSugarPP ? Number(entity.bloodSugarPP) : null;
    dto.bloodSugarRandom = entity.bloodSugarRandom ? Number(entity.bloodSugarRandom) : null;

    dto.painScore = entity.painScore;

    dto.chiefComplaints = entity.chiefComplaints;
    dto.notes = entity.notes;
    dto.recordedBy = entity.recordedBy;
    dto.recordedAt = entity.recordedAt;

    // Generate flags for abnormal values
    dto.flags = VitalsResponseDto.generateFlags(dto);

    return dto;
  }

  private static getBmiCategory(bmi: number): string {
    if (bmi < 16.0) return 'Severely Underweight';
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25.0) return 'Normal';
    if (bmi < 30.0) return 'Overweight';
    if (bmi < 35.0) return 'Obese Class I';
    if (bmi < 40.0) return 'Obese Class II';
    return 'Obese Class III';
  }

  private static generateFlags(dto: VitalsResponseDto): VitalFlag[] {
    const flags: VitalFlag[] = [];
    const ranges = VITALS_NORMAL_RANGES;

    const checkField = (
      field: string,
      value: number | null,
      range: { min: number; max: number },
    ) => {
      if (value === null) return;

      let status: 'NORMAL' | 'LOW' | 'HIGH' | 'CRITICAL' = 'NORMAL';

      if (value < range.min) {
        status = 'LOW';
      } else if (value > range.max) {
        status = 'HIGH';
      }

      if (status !== 'NORMAL') {
        flags.push({
          field,
          value,
          status,
          normalRange: range,
        });
      }
    };

    checkField('temperatureF', dto.temperatureF, ranges.temperatureF);
    checkField('bloodPressureSys', dto.bloodPressureSys, ranges.bloodPressureSys);
    checkField('bloodPressureDia', dto.bloodPressureDia, ranges.bloodPressureDia);
    checkField('pulseRate', dto.pulseRate, ranges.pulseRate);
    checkField('respiratoryRate', dto.respiratoryRate, ranges.respiratoryRate);
    checkField('spo2', dto.spo2, ranges.spo2);
    checkField('bloodSugarFasting', dto.bloodSugarFasting, ranges.bloodSugarFasting);
    checkField('bloodSugarPP', dto.bloodSugarPP, ranges.bloodSugarPP);
    checkField('bloodSugarRandom', dto.bloodSugarRandom, ranges.bloodSugarRandom);
    checkField('bmi', dto.bmi, ranges.bmi);

    return flags;
  }
}

// Vitals history list
export class VitalsListResponseDto {
  data!: VitalsResponseDto[];
  meta!: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}