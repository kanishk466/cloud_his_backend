import { Injectable, NotFoundException } from '@nestjs/common';
import { DoctorsRepository } from '../repositories/doctors.repository';
import {
  deleteSignatureFile,
  saveSignatureFile,
} from '../../../../common/utils/file-upload.util';

@Injectable()
export class DoctorsService {
  constructor(private readonly repo: DoctorsRepository) {}

  async findOne(tenantId: string, doctorProfileId: string) {
    const doctor = await this.repo.findById(tenantId, doctorProfileId);
    if (!doctor) throw new NotFoundException('Doctor profile not found');
    return doctor;
  }

  // ─── Digital signature upload ─────────────────────────────────────────────

  async uploadSignature(
    tenantId: string,
    doctorProfileId: string,
    file: Express.Multer.File,
  ) {
    const doctor = await this.findOne(tenantId, doctorProfileId);

    const saved = saveSignatureFile(doctorProfileId, file);

    // Replace previous file after the new one is safely on disk
    if (doctor.digitalSignatureUrl) {
      deleteSignatureFile(doctor.digitalSignatureUrl);
    }

    return this.repo.updateSignatureUrl(tenantId, doctorProfileId, saved.url);
  }

  async removeSignature(tenantId: string, doctorProfileId: string) {
    const doctor = await this.findOne(tenantId, doctorProfileId);

    if (doctor.digitalSignatureUrl) {
      deleteSignatureFile(doctor.digitalSignatureUrl);
    }

    await this.repo.updateSignatureUrl(tenantId, doctorProfileId, null);
    return { message: 'Signature removed successfully' };
  }
}
