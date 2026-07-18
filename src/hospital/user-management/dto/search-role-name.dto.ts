import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SearchRoleNameDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  search?: string;
}