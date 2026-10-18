import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { TemplateType } from '@prisma/client';

export class CreateTemplateDto {
  /** Omit for a global template (all departments). */
  @IsOptional()
  @IsUUID()
  labDepartmentId?: string;

  /** Omit = applies to all investigations in the department. */
  @IsOptional()
  @IsUUID()
  investigationId?: string;

  @IsOptional()
  @IsEnum(TemplateType)
  templateType?: TemplateType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  /** HTML/Markdown for the report header (hospital logo, patient block). */
  @IsOptional()
  @IsString()
  headerHtml?: string;

  /** HTML/Markdown for the results body layout. */
  @IsOptional()
  @IsString()
  bodyHtml?: string;

  /** HTML/Markdown for the footer (pathologist sign, disclaimer). */
  @IsOptional()
  @IsString()
  footerHtml?: string;

  /** Custom CSS for print layout. */
  @IsOptional()
  @IsString()
  cssStyles?: string;

  /** true = default template for its scope (unsets any existing default). */
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
