import { IsString, IsOptional, IsBoolean, IsUUID, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInterpretationDto {
  @ApiPropertyOptional({ description: 'Linked observation id (optional)' })
  @IsOptional()
  @IsUUID()
  observationId?: string;

  @ApiPropertyOptional({ example: 'Anemia Interpretation' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => value?.trim())
  title?: string;

  @ApiProperty({ example: '<p>Low Hb suggests anemia.</p>', description: 'Rich text (HTML)' })
  @IsString()
  bodyHtml: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
