import { ApiPropertyOptional } from '@nestjs/swagger';
import { PlatformRole } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class ListPlatformUsersDto {
  @ApiPropertyOptional({ enum: PlatformRole, example: PlatformRole.PLATFORM_ADMIN })
  @IsOptional()
  @IsEnum(PlatformRole)
  role?: PlatformRole;
}
