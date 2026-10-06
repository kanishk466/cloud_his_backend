import { PartialType } from '@nestjs/swagger';
import { CreateStateDto } from './create-state.dto';

export class UpdateStateDto extends PartialType(CreateStateDto) {}
