import { IsString, IsOptional, IsBoolean, IsEmail, IsInt, MaxLength, MinLength, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOutsourceLabDto {
  @ApiProperty({ example: 'Metropolis Labs' })
  @IsString() @MinLength(1) @MaxLength(200)
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiPropertyOptional({ example: 'Mumbai' })
  @IsOptional() @IsString() @MaxLength(300)
  @Transform(({ value }) => value?.trim())
  address?: string;

  @ApiPropertyOptional({ example: 'Ravi Mehta' })
  @IsOptional() @IsString() @MaxLength(150)
  @Transform(({ value }) => value?.trim())
  contactPerson?: string;

  @ApiPropertyOptional({ example: '+91 98200 11111' })
  @IsOptional() @IsString() @MaxLength(20)
  @Transform(({ value }) => value?.trim())
  mobile?: string;

  @ApiPropertyOptional({ example: 'lab@metropolis.in' })
  @IsOptional() @IsEmail() @MaxLength(150)
  email?: string;

  @ApiPropertyOptional({ example: 1440, description: 'Default TAT in minutes' })
  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  defaultTat?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
