import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DiscountApplicableType } from '@prisma/client';
import { DiscountValidationService } from './discount-validation.service';
import { HospitalJwtAuthGuard } from '../../../../hospital/identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { CurrentTenant } from '../../../../hospital/core/decorators/current-tenant.decorator';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../../../hospital/core/decorators/current-user.decorator';

class ValidateDiscountDto {
  @ApiProperty({ enum: DiscountApplicableType, example: 'OPD' })
  @IsEnum(DiscountApplicableType)
  module: DiscountApplicableType;

  @ApiProperty({ example: 15 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent: number;

  @ApiPropertyOptional({ example: 1500 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @ApiProperty({ example: 'OpdBill' })
  @IsString()
  referenceType: string;

  @ApiProperty({ example: 'bill-uuid' })
  @IsString()
  referenceId: string;

  @ApiProperty({ example: 10000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  originalAmount: number;

  @ApiProperty({ example: 8500 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  finalAmount: number;

  @ApiProperty({ description: 'Selected DiscountReason id' })
  @IsUUID()
  reasonId: string;

  @ApiPropertyOptional({ description: 'Selected DiscountApproval id' })
  @IsOptional()
  @IsUUID()
  approvalId?: string;

  @ApiPropertyOptional({ example: 'Management approval' })
  @IsOptional()
  @IsString()
  remarks?: string;
}

@ApiTags('Basic Master — Discount Validation')
@ApiBearerAuth('access-token')
@Controller('master-config/basic/discounts')
@UseGuards(HospitalJwtAuthGuard)
export class DiscountValidationController {
  constructor(private readonly service: DiscountValidationService) {}

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Validate a discount (reason + threshold + authority limits) and record it',
    description:
      'Reusable by OPD/IPD billing. Enforces reason, approval requirement, and authority limits; writes a DiscountAuditLog row.',
  })
  @ApiResponse({ status: 200, description: 'Discount validated' })
  @ApiResponse({ status: 400, description: 'Invalid reason / module' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Approval required or authority limit exceeded' })
  validate(
    @CurrentTenant() tenantId: string,
    @Body() dto: ValidateDiscountDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.validateAndLog({
      ...dto,
      tenantId,
      appliedByUserId: user.userId,
    });
  }
}
