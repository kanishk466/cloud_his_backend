import { ConflictException, Injectable } from '@nestjs/common';
import { RoleNameRepository } from '../repositories/role-name.repository';
import { CreateRoleNameDto } from '../dto/create-role-name.dto';

@Injectable()
export class RoleNameService {
  constructor(private readonly repo: RoleNameRepository) {}

  findAll(search?: string) {
    return this.repo.findAll(search);
  }

  async create(hospitalId: number, dto: CreateRoleNameDto) {
    const existing = await this.repo.findByCode(dto.code);
    if (existing) {
      throw new ConflictException(
        `Role name with code '${dto.code}' already exists. Use the existing one.`,
      );
    }

    return this.repo.create({
      name: dto.name,
      code: dto.code,
      description: dto.description,
      createdByHospitalId: hospitalId,
    });
  }
}