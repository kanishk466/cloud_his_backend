import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'NewSecret@123', minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
