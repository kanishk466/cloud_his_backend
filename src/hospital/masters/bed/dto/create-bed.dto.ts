import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsArray,
  ValidateNested,
  IsInt,
  MaxLength,
  MinLength,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBedDto {
  @ApiProperty({ description: 'Parent room id' })
  @IsUUID()
  roomId: string;

  @ApiProperty({ example: '101-A' })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  @Transform(({ value }) => value?.trim())
  bedNo: string;

  @ApiPropertyOptional({ example: 'Window side' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  @Transform(({ value }) => value?.trim())
  description?: string;

  @ApiPropertyOptional({ example: true, default: true, description: 'Counts in BOR census' })
  @IsOptional()
  @IsBoolean()
  isCount?: boolean;

  @ApiPropertyOptional({ description: 'Amenity ids to attach' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  amenityIds?: string[];

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
