import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../identity/guards/jwt-auth.guard';
import { CatalogService } from '../services/catalog.service';
import { CreateModuleDto } from '../dto/create-module.dto';
import { CreateFeatureDto } from '../dto/create-feature.dto';

@ApiTags('Catalog')
@ApiBearerAuth('access-token')
@Controller('catalog')
@UseGuards(JwtAuthGuard)
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Post('modules')
  createModule(@Body() dto: CreateModuleDto) {
    return this.catalogService.createModule(dto);
  }

  @Get('modules')
  getModules() {
    return this.catalogService.getModules();
  }

  @Get('modules/:id')
  getModuleById(@Param('id', ParseIntPipe) id: number) {
    return this.catalogService.getModuleById(id);
  }

  @Get('features')
  @ApiOperation({
    summary: 'List all features with their parent module(s)',
  })
  @ApiResponse({
    status: 200,
    description: 'Features returned',
    schema: {
      example: [
        {
          id: 1,
          name: 'View Dashboard',
          code: 'DASHBOARD_VIEW',
          description: null,
          createdAt: '2026-07-26T10:00:00.000Z',
          updatedAt: '2026-07-26T10:00:00.000Z',
          modules: [{ id: 1, name: 'Dashboard', code: 'DASHBOARD' }],
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getFeatures() {
    return this.catalogService.getFeatures();
  }

  @Post('features')
  createFeature(@Body() dto: CreateFeatureDto) {
    return this.catalogService.createFeature(dto);
  }

  @Post('modules/:moduleId/features/:featureId')
  attachFeature(
    @Param('moduleId', ParseIntPipe) moduleId: number,
    @Param('featureId', ParseIntPipe) featureId: number,
  ) {
    return this.catalogService.attachFeature(moduleId, featureId);
  }
}