import { PartialType } from '@nestjs/mapped-types';
import { CreateOutsourceLabDto } from './create-outsource-lab.dto';

export class UpdateOutsourceLabDto extends PartialType(CreateOutsourceLabDto) {}
