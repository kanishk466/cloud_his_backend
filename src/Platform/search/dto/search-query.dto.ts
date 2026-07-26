import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class SearchQueryDto {
  @ApiProperty({ example: 'apollo', minLength: 2 })
  @IsString()
  @MinLength(2)
  q!: string;
}
