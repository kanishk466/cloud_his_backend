import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreatePanelDocumentDto } from './create-panel-document.dto';

// panelId / documentCode identity can't change — delete + recreate instead.
export class UpdatePanelDocumentDto extends PartialType(
  OmitType(CreatePanelDocumentDto, ['panelId', 'documentCode'] as const),
) {}
