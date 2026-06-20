import {
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateFeatureDto {
  @IsString()
  name!: string;

  @IsString()
  code!: string;

  @IsOptional()
  @IsString()
  description?: string;
}