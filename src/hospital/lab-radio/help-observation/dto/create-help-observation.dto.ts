import { IsString, IsOptional, IsBoolean, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateHelpObservationDto {
  @ApiProperty({ description: 'Observation id this help text belongs to' })
  @IsString()
  observationId: string;

  @ApiProperty({ example: 'Reference range may vary slightly between labs.' })
  @IsString() @MinLength(1) @MaxLength(2000)
  @Transform(({ value }) => value?.trim())
  helpText: string;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional() @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
