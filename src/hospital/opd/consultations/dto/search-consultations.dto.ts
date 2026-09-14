import {
    IsOptional,
    IsString,
    IsEnum,
    IsUUID,
    IsDateString,
    IsInt,
    Min,
    Max,
  } from 'class-validator';
  import { Type } from 'class-transformer';
  import { ConsultationStatus } from '@prisma/client'; // or from prisma/client
  
  export class SearchConsultationsDto {
    // Search text for Consultation No, Patient Name, UHID, Diagnosis, ICD Code
    @IsOptional()
    @IsString()
    search?: string;
  
    @IsOptional()
    @IsUUID()
    doctorProfileId?: string;
  
    @IsOptional()
    @IsString()
    status?: string; // IN_PROGRESS, COMPLETED, REFERRED
  
    @IsOptional()
    @IsDateString()
    fromDate?: string;
  
    @IsOptional()
    @IsDateString()
    toDate?: string;
  
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;
  
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 8; // Default 8 per page (as shown in UI "8 / page")
  }