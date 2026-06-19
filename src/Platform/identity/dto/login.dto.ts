import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'john@example.com',
    description: 'User email address',
    format: 'email',
    required: true,
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'secret123',
    description: 'User password',
    format: 'password',
    minLength: 6,
    required: true,
  })
  @IsString()
  @MinLength(6)
  password!: string;
}