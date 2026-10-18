import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateThresholdDto } from './create-threshold.dto';

// Identity (panelId / roomTypeId) can't change — delete + recreate instead.
export class UpdateThresholdDto extends PartialType(
  OmitType(CreateThresholdDto, ['panelId', 'roomTypeId'] as const),
) {
  // Allow toggling isActive via update
  isActive?: boolean;
}
