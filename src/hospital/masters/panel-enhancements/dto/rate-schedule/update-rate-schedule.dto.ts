import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateRateScheduleDto } from './create-rate-schedule.dto';

// panelId / tariffId identity can't change — delete + recreate instead.
export class UpdateRateScheduleDto extends PartialType(
  OmitType(CreateRateScheduleDto, ['panelId', 'tariffId'] as const),
) {}
