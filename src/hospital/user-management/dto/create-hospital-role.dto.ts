// import { Transform } from 'class-transformer';
// import {
//   IsInt,
//   IsNotEmpty,
//   IsOptional,
//   IsString,
//   MaxLength,
// } from 'class-validator';

// export class CreateHospitalRoleDto {
//   @IsInt()
//   @IsNotEmpty()
//   roleNameId!: number;

//   @IsOptional()
//   @IsString()
//   @MaxLength(200)
//   @Transform(({ value }) =>
//     typeof value === 'string' ? value.trim() : value,
//   )
//   description?: string;
// }


import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class CreateHospitalRoleDto {
  // ─── SCENARIO A: CHOOSE EXISTING MASTER ROLE ──────────────────────────
  // Required only if custom 'roleName' is not provided.
  @ValidateIf((o) => !o.roleName)
  @IsNotEmpty({ message: 'Either roleNameId or custom roleName must be provided' })
  @IsInt({ message: 'roleNameId must be an integer' })
  roleNameId?: number;

  // ─── SCENARIO B: CREATE CUSTOM ROLE ───────────────────────────────────
  // Required only if 'roleNameId' is not provided.
  @ValidateIf((o) => !o.roleNameId)
  @IsNotEmpty({ message: 'Either roleNameId or custom roleName must be provided' })
  @IsString({ message: 'roleName must be a string' })
  @MaxLength(50, { message: 'roleName cannot exceed 50 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  roleName?: string;

  // Optional alphanumeric code. Auto-converts to trimmed UPPERCASE (e.g., "jr_pharmacist" -> "JR_PHARMACIST")
  @IsOptional()
  @IsString({ message: 'roleCode must be a string' })
  @MaxLength(30, { message: 'roleCode cannot exceed 30 characters' })
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value.trim().toUpperCase().replace(/\s+/g, '_')
      : value,
  )
  roleCode?: string;

  // ─── GENERAL PROPERTIES ───────────────────────────────────────────────
  @IsOptional()
  @IsString({ message: 'description must be a string' })
  @MaxLength(200, { message: 'description cannot exceed 200 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  description?: string;

  // Optional existing hospital role ID to clone permissions from (Scenario A + Clone / Scenario B + Clone)
  @IsOptional()
  @IsInt({ message: 'cloneFromRoleId must be an integer' })
  cloneFromRoleId?: number;
}