import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { HospitalJwtAuthGuard } from '../../identity/guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { GeoService } from './geo.service';
import { CreateCountryDto } from './dto/create-country.dto';
import { CreateStateDto } from './dto/create-state.dto';
import { CreateCityDto } from './dto/create-city.dto';

@Controller('hospital/masters/geo')
@UseGuards(HospitalJwtAuthGuard)
export class GeoController {
  constructor(private readonly service: GeoService) {}

  @Post('countries')
  @HttpCode(HttpStatus.CREATED)
  createCountry(@Body() dto: CreateCountryDto) {
    return this.service.createCountry(dto);
  }

  @Get('countries')
  listCountries() {
    return this.service.listCountries();
  }

  @Post('states')
  @HttpCode(HttpStatus.CREATED)
  createState(@Body() dto: CreateStateDto) {
    return this.service.createState(dto);
  }

  @Get('countries/:countryId/states')
  listStates(@Param('countryId', ParseIntPipe) countryId: number) {
    return this.service.listStates(countryId);
  }

  @Post('cities')
  @HttpCode(HttpStatus.CREATED)
  createCity(@Body() dto: CreateCityDto) {
    return this.service.createCity(dto);
  }

  @Get('states/:stateId/cities')
  listCities(@Param('stateId', ParseIntPipe) stateId: number) {
    return this.service.listCities(stateId);
  }
}
