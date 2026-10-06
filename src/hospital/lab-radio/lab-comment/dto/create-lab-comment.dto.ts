import { IsString, IsOptional, IsBoolean, IsUUID, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLabCommentDto {
  @ApiPropertyOptional({ description: 'Investigation id (optional — global comment if omitted)' })
  @IsOptional()
  @IsUUID()
  investigationId?: string;

  @ApiProperty({ example: 'Sample slightly hemolysed.' })
  @IsString() @MinLength(1) @MaxLength(2000)
  @Transform(({ value }) => value?.trim())
  commentText: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
