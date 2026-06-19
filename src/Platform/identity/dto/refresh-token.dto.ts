import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT refresh token issued during login',
    format: 'jwt',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}