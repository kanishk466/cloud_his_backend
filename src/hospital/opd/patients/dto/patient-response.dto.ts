import { Exclude, Expose, Transform } from 'class-transformer';

export enum PatientStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DECEASED = 'DECEASED',
}

// What we send back to client
// Sensitive fields excluded
@Exclude()
export class PatientResponseDto {
  @Expose()
  id!: string;

  @Expose()
  uhid!: string;

  @Expose()
  firstName!: string;

  @Expose()
  lastName!: string | null;

  @Expose()
  // Computed: "Ramesh Kumar"
  get fullName(): string {
    return [this.firstName, this.lastName]
      .filter(Boolean)
      .join(' ');
  }

  @Expose()
  gender!: string;

  @Expose()
  @Transform(({ value }) =>
    value ? new Date(value).toISOString().split('T')[0] : null,
  )
  dateOfBirth!: string | null;

  @Expose()
  age!: number | null;

  @Expose()
  ageUnit!: string | null;

  @Expose()
  bloodGroup!: string | null;

  @Expose()
  maritalStatus!: string | null;

  @Expose()
  mobile!: string;

  @Expose()
  alternateMobile!: string | null;

  @Expose()
  email!: string | null;

  @Expose()
  address!: string | null;

  @Expose()
  city!: string | null;

  @Expose()
  district!: string | null;

  @Expose()
  state!: string | null;

  @Expose()
  pincode!: string | null;

  // NEVER expose aadhaar fully
  @Expose()
  @Transform(({ value }) =>
    value ? `XXXX-XXXX-${value.slice(-4)}` : null,
  )
  aadhaarNumber!: string | null;

  @Expose()
  abhaId!: string | null;

  @Expose()
  guardianName!: string | null;

  @Expose()
  guardianRelation!: string | null;

  @Expose()
  guardianMobile!: string | null;

  @Expose()
  insuranceProvider!: string | null;

  @Expose()
  insurancePolicyNo!: string | null;

  @Expose()
  allergies!: string | null;

  @Expose()
  chronicDiseases!: string | null;

  @Expose()
  patientType!: string;

  @Expose()
  status!: string;

  @Expose()
  registeredAt!: Date;

  // Excluded from response
  tenantId!: string;        // Never expose tenant info
  registeredBy!: string;    // Internal field

  constructor(partial: Partial<PatientResponseDto>) {
    Object.assign(this, partial);
  }

  static fromEntity(entity: any): PatientResponseDto {
    return new PatientResponseDto(entity);
  }
}

// Paginated list response
export class PatientListResponseDto {
  data!: PatientResponseDto[];
  meta!: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}