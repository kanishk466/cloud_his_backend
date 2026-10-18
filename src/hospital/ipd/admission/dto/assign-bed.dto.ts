import { IsNotEmpty, IsUUID } from 'class-validator';

export class AssignBedDto {
  @IsUUID()
  @IsNotEmpty()
  bedId: string;
}
