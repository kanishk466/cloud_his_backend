import { PartialType } from '@nestjs/mapped-types';
import { CreateMicroMasterDto } from './create-micro-master.dto';

export class UpdateMicroMasterDto extends PartialType(CreateMicroMasterDto) {}
