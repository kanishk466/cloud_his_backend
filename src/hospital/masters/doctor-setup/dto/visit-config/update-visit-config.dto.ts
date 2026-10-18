import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateVisitConfigDto } from './create-visit-config.dto';

// doctorProfileId / panelId identity can't change on update — re-upsert instead.
export class UpdateVisitConfigDto extends PartialType(
  OmitType(CreateVisitConfigDto, ['doctorProfileId', 'panelId'] as const),
) {}
