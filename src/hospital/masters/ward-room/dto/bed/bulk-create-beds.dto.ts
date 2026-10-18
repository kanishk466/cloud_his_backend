import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Bulk generator: beds startNumber…endNumber (zero-padded) in one room. */
export class BulkCreateBedsDto {
  @IsUUID()
  @IsNotEmpty()
  roomId: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  startNumber: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(500)
  endNumber: number;

  /** Optional prefix for bed numbers, e.g. "A" → A01…A10. */
  @IsOptional()
  @IsString()
  @MaxLength(5)
  prefix?: string;
}
