import { IsNotEmpty, IsString } from 'class-validator';

export class HospitalRefreshDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}