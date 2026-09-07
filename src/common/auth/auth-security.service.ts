import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { MailService } from '../../Platform/mail/mail.service';

// === SECURITY ADDITION START ===
@Injectable()
export class AuthSecurityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async recordFailedLogin(userId: string, hospital: boolean) {
    const user = await (hospital
      ? this.prisma.hospitalUser.findUnique({ where: { id: userId } })
      : this.prisma.platformUser.findUnique({ where: { id: userId } }));
    const attempts = (user?.failedLoginAttempts ?? 0) + 1;
    const lockedUntil = attempts >= 5 ? new Date(Date.now() + 30 * 60000) : null;
    if (hospital) {
      await this.prisma.hospitalUser.update({ where: { id: userId }, data: { failedLoginAttempts: attempts, lockedUntil } });
    } else {
      await this.prisma.platformUser.update({ where: { id: userId }, data: { failedLoginAttempts: attempts, lockedUntil } });
    }
    return { attempts, lockedUntil };
  }

  async assertLoginAllowed(userId: string, hospital: boolean) {
    const user = await (hospital
      ? this.prisma.hospitalUser.findUnique({ where: { id: userId } })
      : this.prisma.platformUser.findUnique({ where: { id: userId } }));
    if (user?.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      throw new UnauthorizedException(`Account locked. Locked for ${Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000)} min`);
    }
    if (user?.lockedUntil) {
      await clientReset(this.prisma, userId, hospital);
    }
  }

  async resetLoginAttempts(userId: string, hospital: boolean) {
    await clientReset(this.prisma, userId, hospital);
  }

  async createSession(input: { platformUserId?: string; hospitalUserId?: string; deviceName?: string; userAgent?: string; ipAddress?: string }) {
    await this.prisma.authSession.updateMany({
      where: input.platformUserId ? { platformUserId: input.platformUserId, isActive: true } : { hospitalUserId: input.hospitalUserId, isActive: true },
      data: { isActive: false },
    });
    return this.prisma.authSession.create({ data: { ...input, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60000) } });
  }

  async assertActiveSession(sessionId: string | undefined) {
    if (!sessionId) throw new UnauthorizedException('Session is missing');
    const session = await this.prisma.authSession.findUnique({ where: { id: sessionId } });
    if (!session?.isActive || session.expiresAt.getTime() <= Date.now()) throw new UnauthorizedException('Session is no longer active');
    await this.prisma.authSession.update({ where: { id: sessionId }, data: { lastSeenAt: new Date() } });
  }

  async deactivateSession(sessionId: string | undefined) {
    if (sessionId) await this.prisma.authSession.updateMany({ where: { id: sessionId }, data: { isActive: false } });
  }

// auth-security.service.ts

async createOtp(input: { platformUserId?: string; hospitalUserId?: string; email: string }) {
  const where = input.platformUserId 
    ? { platformUserId: input.platformUserId } 
    : { hospitalUserId: input.hospitalUserId };
    
  const existing = await this.prisma.loginOtp.findFirst({ where });
  
  if (existing && Date.now() - existing.lastSentAt.getTime() < 60000) {
    throw new UnauthorizedException('Please wait 60 seconds before requesting another OTP');
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  
  const data = {
    otpHash: await bcrypt.hash(code, 10),
    attempts: 0,
    expiresAt: new Date(Date.now() + 5 * 60000),
    lastSentAt: new Date(),
  };

  const otp = existing
    ? await this.prisma.loginOtp.update({ where: { id: existing.id }, data })
    : await this.prisma.loginOtp.create({ data: { ...input, ...data } });

  // ✉️ Clean Dedicated OTP Sender
  await this.mailService.sendOtpMail(input.email, code);

  return otp;
}

  async verifyOtp(id: string, code: string) {
    const otp = await this.prisma.loginOtp.findUnique({ where: { id } });
    if (!otp || otp.expiresAt.getTime() <= Date.now()) throw new UnauthorizedException('OTP expired');
    if (otp.attempts >= 3) throw new UnauthorizedException('Maximum OTP attempts exceeded; request a new OTP');
    if (!(await bcrypt.compare(code, otp.otpHash))) {
      if (otp.attempts >= 2) await this.prisma.loginOtp.delete({ where: { id } });
      else await this.prisma.loginOtp.update({ where: { id }, data: { attempts: { increment: 1 } } });
      throw new UnauthorizedException('Invalid OTP');
    }
    await this.prisma.loginOtp.delete({ where: { id } });
    return otp;
  }
}

// === SECURITY ADDITION START ===
export function assertPasswordPolicy(password: string) {
  if (!/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=]).{8,128}$/.test(password)) {
    throw new UnauthorizedException('Password must be 8-128 characters and contain uppercase, lowercase, number, and special character');
  }
}
// === SECURITY ADDITION END ===

async function clientReset(prisma: PrismaService, userId: string, hospital: boolean) {
  if (hospital) return prisma.hospitalUser.update({ where: { id: userId }, data: { failedLoginAttempts: 0, lockedUntil: null } });
  return prisma.platformUser.update({ where: { id: userId }, data: { failedLoginAttempts: 0, lockedUntil: null } });
}
// === SECURITY ADDITION END ===



