import { PartialType } from '@nestjs/swagger';
import { CreateBankDto } from './create-bank.dto';

export class UpdateBankDto extends PartialType(CreateBankDto) {}
