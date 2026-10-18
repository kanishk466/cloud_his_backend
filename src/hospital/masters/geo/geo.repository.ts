import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { CreateCountryDto } from './dto/create-country.dto';
import { CreateStateDto } from './dto/create-state.dto';
import { CreateCityDto } from './dto/create-city.dto';

@Injectable()
export class GeoRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Countries ───────────────────────────────────────────────────
  createCountry(dto: CreateCountryDto) {
    return this.prisma.country.create({ data: dto });
  }

  findCountries() {
    return this.prisma.country.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  findCountryById(id: number) {
    return this.prisma.country.findUnique({ where: { id } });
  }

  // ─── States ──────────────────────────────────────────────────────
  createState(dto: CreateStateDto) {
    return this.prisma.state.create({ data: dto });
  }

  findStatesByCountry(countryId: number) {
    return this.prisma.state.findMany({
      where: { countryId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  findStateById(id: number) {
    return this.prisma.state.findUnique({ where: { id } });
  }

  // ─── Cities ──────────────────────────────────────────────────────
  createCity(dto: CreateCityDto) {
    return this.prisma.city.create({ data: dto });
  }

  findCitiesByState(stateId: number) {
    return this.prisma.city.findMany({
      where: { stateId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }
}
