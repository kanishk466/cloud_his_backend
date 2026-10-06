import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoomDto {
  @ApiProperty({ description: 'Parent room type id' })
  @IsUUID()
  roomTypeId: string;

  @ApiPropertyOptional({ example: 'Ground Floor' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Transform(({ value }) => value?.trim())
  floorName?: string;

  @ApiProperty({ example: 'ICU-1' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  @Transform(({ value }) => value?.trim())
  roomName: string;

  @ApiProperty({ example: '101' })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  @Transform(({ value }) => value?.trim())
  roomNo: string;

  @ApiPropertyOptional({ example: 'Corner room with 2 beds' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  @Transform(({ value }) => value?.trim())
  description?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
