import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateHospitalDto {
  @ApiProperty({
    example: 'ABC-HOSP',
    description: 'Short unique identifier for the hospital',
  })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ example: 'ABC Multispeciality Hospital' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    example: 'admin@abchospital.in',
    description: 'Hospital admin email — must be unique across tenants',
  })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: '+91 98200 11111' })
  @IsOptional()
  @IsString()
  phone?: string;
}
