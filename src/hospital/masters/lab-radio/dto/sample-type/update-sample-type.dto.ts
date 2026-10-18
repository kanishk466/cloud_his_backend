import { PartialType } from '@nestjs/mapped-types';
import { CreateSampleTypeDto } from './create-sample-type.dto';

export class UpdateSampleTypeDto extends PartialType(CreateSampleTypeDto) {}
