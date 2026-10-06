import { PartialType } from '@nestjs/mapped-types';
import { CreateLabCommentDto } from './create-lab-comment.dto';

export class UpdateLabCommentDto extends PartialType(CreateLabCommentDto) {}
