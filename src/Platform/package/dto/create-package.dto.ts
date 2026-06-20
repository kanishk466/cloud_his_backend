import {
  IsOptional,
  IsString,
} from 'class-validator';

export class CreatePackageDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}