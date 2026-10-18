import { IsNotEmpty, IsUUID } from 'class-validator';

export class AssignProDto {
  /** HospitalUser id of the PRO (marketing executive) to assign. */
  @IsUUID()
  @IsNotEmpty()
  proUserId: string;
}
