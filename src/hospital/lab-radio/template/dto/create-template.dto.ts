import { IsString, IsOptional, IsBoolean, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTemplateDto {
  @ApiProperty({ example: 'Normal Chest X-Ray' })
  @IsString() @MinLength(1) @MaxLength(200)
  @Transform(({ value }) => value?.trim())
  title: string;

  @ApiProperty({ example: '<p>Lungs are clear...</p>', description: 'Rich text (HTML)' })
  @IsString() @MinLength(1)
  bodyHtml: string;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional() @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
