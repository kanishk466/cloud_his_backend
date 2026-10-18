import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { GeoRepository } from './geo.repository';
import { CreateCountryDto } from './dto/create-country.dto';
import { CreateStateDto } from './dto/create-state.dto';
import { CreateCityDto } from './dto/create-city.dto';

@Injectable()
export class GeoService {
  constructor(private readonly repo: GeoRepository) {}

  private isUniqueViolation(e: unknown): boolean {
    return (
      e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002'
    );
  }

  // ─── Countries ───────────────────────────────────────────────────
  async createCountry(dto: CreateCountryDto) {
    try {
      return await this.repo.createCountry(dto);
    } catch (e) {
      if (this.isUniqueViolation(e)) {
        throw new ConflictException('Country name or ISO code already exists');
      }
      throw e;
    }
  }

  listCountries() {
    return this.repo.findCountries();
  }

  // ─── States ──────────────────────────────────────────────────────
  async createState(dto: CreateStateDto) {
    await this.ensureCountryExists(dto.countryId);
    try {
      return await this.repo.createState(dto);
    } catch (e) {
      if (this.isUniqueViolation(e)) {
        throw new ConflictException('State already exists in this country');
      }
      throw e;
    }
  }

  async listStates(countryId: number) {
    await this.ensureCountryExists(countryId);
    return this.repo.findStatesByCountry(countryId);
  }

  // ─── Cities ──────────────────────────────────────────────────────
  async createCity(dto: CreateCityDto) {
    await this.ensureStateExists(dto.stateId);
    try {
      return await this.repo.createCity(dto);
    } catch (e) {
      if (this.isUniqueViolation(e)) {
        throw new ConflictException('City already exists in this state');
      }
      throw e;
    }
  }

  async listCities(stateId: number) {
    await this.ensureStateExists(stateId);
    return this.repo.findCitiesByState(stateId);
  }

  // ─── Helpers ─────────────────────────────────────────────────────
  private async ensureCountryExists(id: number) {
    const country = await this.repo.findCountryById(id);
    if (!country) throw new NotFoundException('Country not found');
  }

  private async ensureStateExists(id: number) {
    const state = await this.repo.findStateById(id);
    if (!state) throw new NotFoundException('State not found');
  }
}
