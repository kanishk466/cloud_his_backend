import { PartialType } from '@nestjs/mapped-types';
import { CreateAntibioticDto } from './create-antibiotic.dto';

export class UpdateAntibioticDto extends PartialType(CreateAntibioticDto) {}
