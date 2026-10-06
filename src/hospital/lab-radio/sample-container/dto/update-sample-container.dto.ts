import { PartialType } from '@nestjs/mapped-types';
import { CreateSampleContainerDto } from './create-sample-container.dto';

export class UpdateSampleContainerDto extends PartialType(CreateSampleContainerDto) {}
