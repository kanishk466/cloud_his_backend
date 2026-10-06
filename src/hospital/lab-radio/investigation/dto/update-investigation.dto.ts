import { PartialType } from '@nestjs/mapped-types';
import { CreateInvestigationDto } from './create-investigation.dto';

export class UpdateInvestigationDto extends PartialType(CreateInvestigationDto) {}
