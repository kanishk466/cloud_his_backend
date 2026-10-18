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

  // ── Extended registration fields (all optional) ──
  @Expose()
  title!: string | null;
  @Expose()
  middleName!: string | null;
  @Expose()
  barcode!: string | null;
  @Expose()
  permanentAddress!: string | null;
  @Expose()
  idProofName!: string | null;
  @Expose()
  idProofNo!: string | null;
  @Expose()
  nationalId!: string | null;
  @Expose()
  passportNo!: string | null;
  @Expose()
  kraPin!: string | null;
  @Expose()
  familyNumber!: string | null;
  @Expose()
  staffId!: string | null;
  @Expose()
  dependentId!: string | null;
  @Expose()
  pregnancyDays!: number | null;
  @Expose()
  occupation!: string | null;
  @Expose()
  birthPlace!: string | null;
  @Expose()
  religion!: string | null;
  @Expose()
  locality!: string | null;
  @Expose()
  membershipNo!: string | null;
  @Expose()
  source!: string | null;
  @Expose()
  employeeReferenceId!: string | null;
  @Expose()
  identityMark1!: string | null;
  @Expose()
  identityMark2!: string | null;
  @Expose()
  referenceType!: string | null;
  @Expose()
  mlcType!: string | null;
  @Expose()
  mlcNo!: string | null;
  @Expose()
  isInternational!: boolean;
  @Expose()
  internationalNo!: string | null;
  @Expose()
  emergencyFirstName!: string | null;
  @Expose()
  emergencyLastName!: string | null;
  @Expose()
  emergencyRelation!: string | null;
  @Expose()
  emergencyMobile!: string | null;
  @Expose()
  emergencyResidentNo!: string | null;
  @Expose()
  emergencyAddress!: string | null;
  @Expose()
  insuranceGroup!: string | null;
  @Expose()
  insurance!: string | null;
  @Expose()
  policyCardNo!: string | null;
  @Expose()
  nameOnCard!: string | null;
  @Expose()
  cardHolder!: string | null;
  @Expose()
  approvalAmount!: number | null;
  @Expose()
  approvalRemark!: string | null;

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