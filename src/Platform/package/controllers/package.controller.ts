import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../identity/guards/jwt-auth.guard';
import { PackageService } from '../services/package.service';
import { CreatePackageDto } from '../dto/create-package.dto';
import { UpdatePackageDto } from '../dto/update-package.dto';
import { actorFromRequest } from '../../audit/audit-actor';

@ApiTags('Packages')
@ApiBearerAuth('access-token')
@Controller('packages')
@UseGuards(JwtAuthGuard)
export class PackageController {
  constructor(private readonly packageService: PackageService) {}

  @Post()
  @ApiOperation({ summary: 'Create a subscription package' })
  @ApiResponse({ status: 201, description: 'Package created' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'Package name already exists' })
  createPackage(@Request() req: any, @Body() dto: CreatePackageDto) {
    return this.packageService.createPackage(dto, actorFromRequest(req));
  }

  @Get()
  @ApiOperation({
    summary: 'List all packages with module entitlements and hospital counts',
  })
  @ApiResponse({ status: 200, description: 'Packages returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getPackages() {
    return this.packageService.getPackages();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single package by id' })
  @ApiResponse({ status: 200, description: 'Package returned' })
  @ApiResponse({ status: 400, description: 'Invalid package id' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Package not found' })
  getPackageById(@Param('id', ParseIntPipe) id: number) {
    return this.packageService.getPackageById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a package' })
  @ApiResponse({ status: 200, description: 'Package updated' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Package not found' })
  @ApiResponse({ status: 409, description: 'Package name already exists' })
  updatePackage(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePackageDto,
  ) {
    return this.packageService.updatePackage(id, dto, actorFromRequest(req));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a package' })
  @ApiResponse({ status: 200, description: 'Package deleted' })
  @ApiResponse({ status: 400, description: 'Invalid package id' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Package not found' })
  @ApiResponse({ status: 409, description: 'Package is assigned to hospitals' })
  removePackage(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.packageService.removePackage(id, actorFromRequest(req));
  }

  @Post(':packageId/modules/:moduleId')
  @ApiOperation({ summary: 'Attach a catalog module to a package' })
  @ApiResponse({ status: 201, description: 'Module attached' })
  @ApiResponse({ status: 400, description: 'Module is inactive' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Package or module not found' })
  @ApiResponse({ status: 409, description: 'Module already attached' })
  attachModule(
    @Param('packageId', ParseIntPipe) packageId: number,
    @Param('moduleId', ParseIntPipe) moduleId: number,
  ) {
    return this.packageService.attachModule(packageId, moduleId);
  }
}
