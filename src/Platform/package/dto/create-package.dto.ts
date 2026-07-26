import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreatePackageDto {
  @ApiProperty({ example: 'PREMIUM' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'For growing multi-branch hospitals' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 7999, description: 'Monthly price in paise/cents' })
  @IsInt()
  @Min(0)
  monthlyPrice!: number;

  @ApiProperty({ example: 79990, description: 'Yearly price in paise/cents' })
  @IsInt()
  @Min(0)
  yearlyPrice!: number;

  @ApiProperty({ example: 25 })
  @IsInt()
  @Min(1)
  maxDoctors!: number;

  @ApiProperty({ example: 150 })
  @IsInt()
  @Min(1)
  maxStorageGb!: number;

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(1)
  maxBranches!: number;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isPopular?: boolean;
}
