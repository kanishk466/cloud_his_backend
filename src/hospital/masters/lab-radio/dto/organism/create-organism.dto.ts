import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { OrganismType } from '@prisma/client';

export class CreateOrganismDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  @Matches(/^[A-Z0-9_-]+$/, {
    message: 'code may contain only letters, digits, underscore and hyphen',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  code: string;

  @IsOptional()
  @IsEnum(OrganismType)
  organismType?: OrganismType;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  /** Highlights common pathogens at the top of data-entry pickers. */
  @IsOptional()
  @IsBoolean()
  isCommon?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
