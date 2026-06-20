import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../identity/guards/jwt-auth.guard';

import { CatalogService } from '../services/catalog.service';

import { CreateModuleDto } from '../dto/create-module.dto';
import { CreateFeatureDto } from '../dto/create-feature.dto';

@Controller('catalog')
@UseGuards(JwtAuthGuard)
export class CatalogController {
  constructor(
    private readonly catalogService: CatalogService,
  ) {}

  @Post('modules')
  createModule(
    @Body() dto: CreateModuleDto,
  ) {
    return this.catalogService.createModule(
      dto,
    );
  }

  @Get('modules')
  getModules() {
    return this.catalogService.getModules();
  }

  @Post('features')
  createFeature(
    @Body() dto: CreateFeatureDto,
  ) {
    return this.catalogService.createFeature(
      dto,
    );
  }

  @Post(
    'modules/:moduleId/features/:featureId',
  )
  attachFeature(
    @Param('moduleId')
    moduleId: string,

    @Param('featureId')
    featureId: string,
  ) {
    return this.catalogService.attachFeature(
      moduleId,
      featureId,
    );
  }
}