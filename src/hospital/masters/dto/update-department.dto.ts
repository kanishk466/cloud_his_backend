import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { CreateDepartmentDto } from './create-department.dto';
import { PartialType } from '@nestjs/swagger';

// export class UpdateDepartmentDto {
//   @IsOptional()
//   @IsString()
//   @MaxLength(120)
//   @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
//   name?: string;

//   @IsOptional()
//   @IsString()
//   @MaxLength(50)
//   @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
//   code?: string;
// }

export class UpdateDepartmentDto extends PartialType(CreateDepartmentDto) { }