import { PartialType } from '@nestjs/mapped-types';
import { CreateReportCommentDto } from './create-report-comment.dto';

export class UpdateReportCommentDto extends PartialType(
  CreateReportCommentDto,
) {}
