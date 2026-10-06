import { IsUUID, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CheckThresholdDto {
  @ApiProperty({ description: 'Admission\'s panel id' })
  @IsUUID()
  panelId: string;

  @ApiProperty({ description: 'Admission\'s room type id' })
  @IsUUID()
  roomTypeId: string;

  @ApiProperty({ example: 62000, description: 'Current provisional bill amount' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  currentAmount: number;
}
