import { PartialType } from '@nestjs/mapped-types';
import { CreatePanelDto } from './create-panel.dto';
import { IsOptional, IsBoolean } from 'class-validator';

export class UpdatePanelDto extends PartialType(CreatePanelDto) {
  @IsOptional() @IsBoolean()
  isActive?: boolean;
}