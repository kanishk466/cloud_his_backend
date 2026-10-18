import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Matches,
} from 'class-validator';

export const COMMENT_CATEGORIES = [
  'GENERAL',
  'SAMPLE_QUALITY',
  'TECHNICAL',
  'CLINICAL',
  'DISCLAIMER',
] as const;

export class CreateReportCommentDto {
  /** Omit for a global comment (all departments). */
  @IsOptional()
  @IsUUID()
  labDepartmentId?: string;

  @IsOptional()
  @IsIn(COMMENT_CATEGORIES)
  category?: (typeof COMMENT_CATEGORIES)[number];

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  commentText: string;

  /** Quick lookup code, e.g., "HEM", "REP", "LIP" (unique per tenant). */
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^[A-Z0-9_-]+$/, {
    message: 'shortcut may contain only letters, digits, underscore and hyphen',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  shortcut?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
