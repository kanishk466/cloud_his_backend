import { IsString, IsOptional, IsBoolean, IsEnum, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MicroMasterType } from '@prisma/client';

export class CreateMicroMasterDto {
  @ApiProperty({ enum: MicroMasterType, example: 'ORGANISM' })
  @IsEnum(MicroMasterType)
  type: MicroMasterType;

  @ApiProperty({ example: 'E. coli' })
  @IsString() @MinLength(1) @MaxLength(150)
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiPropertyOptional({ example: 'ECOLI' })
  @IsOptional() @IsString() @MaxLength(40)
  @Transform(({ value }) => value?.trim())
  code?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
