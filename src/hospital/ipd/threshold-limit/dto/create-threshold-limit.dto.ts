import {
  IsUUID,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsArray,
  IsString,
  IsEmail,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ThresholdActionType } from '@prisma/client';

export class CreateThresholdLimitDto {
  @ApiProperty({ description: 'Panel id' })
  @IsUUID()
  panelId: string;

  @ApiProperty({ description: 'Room type id' })
  @IsUUID()
  roomTypeId: string;

  @ApiProperty({ example: 50000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  thresholdAmount: number;

  @ApiPropertyOptional({ enum: ThresholdActionType, example: 'SOFT_WARNING', default: 'SOFT_WARNING' })
  @IsOptional()
  @IsEnum(ThresholdActionType)
  actionType?: ThresholdActionType;

  @ApiPropertyOptional({ example: ['billing@hospital.com'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  alertEmails?: string[];

  @ApiPropertyOptional({ example: ['+919820011111'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  alertSmsNumbers?: string[];

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
