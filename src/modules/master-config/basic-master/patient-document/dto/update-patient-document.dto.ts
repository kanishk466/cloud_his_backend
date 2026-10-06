import { PartialType } from '@nestjs/swagger';
import { CreatePatientDocumentDto } from './create-patient-document.dto';

export class UpdatePatientDocumentDto extends PartialType(
  CreatePatientDocumentDto,
) {}
