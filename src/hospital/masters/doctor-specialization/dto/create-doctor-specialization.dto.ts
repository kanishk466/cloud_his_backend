import { IsString, IsOptional, IsBoolean, IsUUID, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDoctorSpecializationDto {
  @ApiProperty({ description: 'Parent clinical department id' })
  @IsUUID()
  clinicalDepartmentId: string;

  @ApiProperty({ example: 'Interventional Cardiology' })
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
