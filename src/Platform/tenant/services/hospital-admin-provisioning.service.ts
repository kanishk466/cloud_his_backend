import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { HospitalUserRepository } from '../repositories/hospital-user.repository';

function generateTempPassword(length = 12) {
  const chars =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$%&*!';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

@Injectable()
export class HospitalAdminProvisioningService {
  constructor(
    private readonly hospitalUserRepository: HospitalUserRepository,
  ) {}

  async provisionIfNotExists(input: {
    tenantId: string;
    email: string;
    hospitalName: string;
    code: string;
  }) {
    const existing = await this.hospitalUserRepository.findSuperAdminByHospital(
      input.tenantId,
    );

    if (existing) {
      return { created: false, admin: { email: existing.email } };
    }

    const password = generateTempPassword(12);
    const passwordHash = await bcrypt.hash(password, 10);

    await this.hospitalUserRepository.createSuperAdmin({
      tenantId: input.tenantId,
      email: input.email,
      username: input.email,
      code: input.code,
      passwordHash,
      firstName: input.hospitalName,
      lastName: 'Admin',
    });

    return { created: true, admin: { email: input.email, password } };
  }
}
