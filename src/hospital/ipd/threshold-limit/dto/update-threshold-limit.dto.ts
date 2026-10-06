import { PartialType } from '@nestjs/mapped-types';
import { CreateThresholdLimitDto } from './create-threshold-limit.dto';

export class UpdateThresholdLimitDto extends PartialType(CreateThresholdLimitDto) {}
