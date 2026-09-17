import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDepartmentDto {
  @IsString() @IsNotEmpty() @MaxLength(120)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name!: string;

  @IsOptional() @IsString() @MaxLength(50)
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_')
      : value,
  )
  code?: string;
  @IsOptional() @IsString() @MaxLength(255) description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}