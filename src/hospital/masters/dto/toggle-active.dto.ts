import { IsBoolean } from 'class-validator';

export class ToggleActiveDto {
  @IsBoolean()
  isActive!: boolean;
}