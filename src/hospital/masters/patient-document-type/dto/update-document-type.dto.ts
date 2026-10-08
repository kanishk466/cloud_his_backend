import { PartialType } from '@nestjs/mapped-types';
import { CreateDocumentTypeDto } from './create-document-type.dto';

// `code` keeps the upper-casing transform inherited from the create DTO.
export class UpdateDocumentTypeDto extends PartialType(CreateDocumentTypeDto) {}
