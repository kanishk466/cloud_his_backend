import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { QueueRepository } from './queue.repository';
import { CreateTokenDto } from './dto/create-token.dto';
import { QueueFilterDto } from './dto/queue-filter.dto';
import {
  QueueTokenDto,
  QueueStatsDto,
  DoctorQueueResponseDto,
  TokenResponseDto,
  DisplayBoardDto,
} from './dto/queue-response.dto';
import {
  QUEUE_ERRORS,
  TOKEN_ELIGIBLE_STATUSES,
  CALLABLE_STATUSES,
  SKIPPABLE_STATUSES,
  COMPLETABLE_STATUSES,
  CANCELLABLE_STATUSES,
} from './constants/queue.constants';
import { format, startOfDay } from 'date-fns';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(private readonly queueRepository: QueueRepository) {}

  // ─── GENERATE TOKEN ─────────────────────────────────────────────
  // Called when receptionist generates token after check-in
  async generateToken(
    tenantId: string,
    dto: CreateTokenDto,
  ): Promise<TokenResponseDto> {
    // Rule 1: Validate appointment exists and belongs to tenant
    const appointment = await this.queueRepository.getAppointment(
      tenantId,
      dto.appointmentId,
    );

    if (!appointment) {
      throw new NotFoundException(QUEUE_ERRORS.APPOINTMENT_NOT_FOUND);
    }

    // Rule 2: Check appointment status
    const isEligible = TOKEN_ELIGIBLE_STATUSES.includes(
      appointment.status as any,
    );

    if (!isEligible) {
      throw new BadRequestException({
        ...QUEUE_ERRORS.INVALID_APPOINTMENT_STATUS,
        details: { currentStatus: appointment.status },
      });
    }

    // Rule 3: Check if token already exists
    const existingToken =
      await this.queueRepository.findByAppointmentId(
        tenantId,
        dto.appointmentId,
      );

    if (existingToken) {
      throw new ConflictException({
        ...QUEUE_ERRORS.TOKEN_ALREADY_EXISTS,
        details: {
          tokenNumber: existingToken.tokenNumber,
          status: existingToken.status,
        },
      });
    }

    // Rule 4: Generate sequential token number
    const today = startOfDay(new Date());
    const tokenDate = startOfDay(new Date(appointment.appointmentDate));

    const tokenNumber =
      await this.queueRepository.generateTokenNumber(
        tenantId,
        appointment.doctorProfileId,
        tokenDate,
      );

    // Rule 5: Calculate estimated time
    const doctor = await this.queueRepository.getDoctorProfile(
      tenantId,
      appointment.doctorProfileId,
    );

    if (!doctor) {
      throw new NotFoundException(QUEUE_ERRORS.DOCTOR_NOT_FOUND);
    }

    const estimatedTime = await this.calculateEstimatedTime(
      tenantId,
      appointment.doctorProfileId,
      tokenDate,
      tokenNumber,
      doctor.slotDurationMins,
    );

    // Rule 6: Create token
    const token = await this.queueRepository.create({
      tenantId,
      appointmentId: dto.appointmentId,
      doctorProfileId: appointment.doctorProfileId,
      tokenNumber,
      tokenDate,
      estimatedTime: estimatedTime ?? undefined,
      roomNo: dto.roomNo,
    });

    // Rule 7: Update appointment status to IN_QUEUE
    await this.queueRepository.updateAppointmentStatus(
      dto.appointmentId,
      'IN_QUEUE',
    );

    this.logger.log(
      `Token #${tokenNumber} generated for appointment ${appointment.appointmentNo}`,
    );

    return this.toTokenResponse(token);
  }

  // ─── GET DOCTOR QUEUE ───────────────────────────────────────────
  // Doctor's main dashboard view
  async getDoctorQueue(
    tenantId: string,
    doctorProfileId: string,
    date?: string,
  ): Promise<DoctorQueueResponseDto> {
    const queryDate = date ? new Date(date) : new Date();
    const dateOnly = startOfDay(queryDate);

    // Validate doctor exists
    const doctor = await this.queueRepository.getDoctorProfile(
      tenantId,
      doctorProfileId,
    );

    if (!doctor) {
      throw new NotFoundException(QUEUE_ERRORS.DOCTOR_NOT_FOUND);
    }

    // Get queue data in parallel
    const [queueResult, stats, currentToken] = await Promise.all([
      this.queueRepository.getDoctorQueue(
        tenantId,
        doctorProfileId,
        dateOnly,
        undefined,
        1,
        100,
      ),
      this.queueRepository.getQueueStats(
        tenantId,
        doctorProfileId,
        dateOnly,
      ),
      this.queueRepository.getCurrentToken(
        tenantId,
        doctorProfileId,
        dateOnly,
      ),
    ]);

    const user = doctor.hospitalUser;

    return {
      doctor: {
        id: doctor.id,
        firstName: user.firstName,
        lastName: user.lastName,
        specialization: doctor.specialization,
        roomNo: queueResult.tokens[0]?.roomNo ?? null,
      },
      date: format(dateOnly, 'yyyy-MM-dd'),
      stats,
      currentToken: currentToken
        ? this.toQueueToken(currentToken)
        : null,
      queue: queueResult.tokens.map((t) => this.toQueueToken(t)),
    };
  }

  // ─── CALL NEXT PATIENT ──────────────────────────────────────────
  // Doctor clicks "Call Next"
  async callNext(
    tenantId: string,
    doctorProfileId: string,
  ): Promise<QueueTokenDto | null> {
    const today = startOfDay(new Date());

    // Rule 1: Check if another patient is IN_PROGRESS
    const currentToken =
      await this.queueRepository.getCurrentToken(
        tenantId,
        doctorProfileId,
        today,
      );

    if (currentToken) {
      throw new BadRequestException({
        ...QUEUE_ERRORS.ANOTHER_IN_PROGRESS,
        details: {
          currentTokenNumber: currentToken.tokenNumber,
          patientName:
            currentToken.appointment?.patient?.firstName ?? 'Unknown',
        },
      });
    }

    // Rule 2: Get next waiting token (priority-aware)
    const nextToken =
      await this.queueRepository.getNextWaitingToken(
        tenantId,
        doctorProfileId,
        today,
      );

    if (!nextToken) {
      return null; // No more patients waiting
    }

    // Rule 3: Update token to IN_PROGRESS
    const updatedToken = await this.queueRepository.updateStatus(
      nextToken.id,
      'IN_PROGRESS',
      {
        calledAt: new Date(),
        startedAt: new Date(),
      },
    );

    // Rule 4: Update appointment to IN_CONSULTATION
    await this.queueRepository.updateAppointmentStatus(
      nextToken.appointmentId,
      'IN_CONSULTATION',
    );

    this.logger.log(
      `Token #${nextToken.tokenNumber} called by doctor ${doctorProfileId}`,
    );

    return this.toQueueToken(updatedToken);
  }

  // ─── CALL SPECIFIC TOKEN ───────────────────────────────────────
  // Doctor calls a specific patient (out of order)
  async callToken(
    tenantId: string,
    tokenId: string,
  ): Promise<QueueTokenDto> {
    const token = await this.queueRepository.findById(
      tenantId,
      tokenId,
    );

    if (!token) {
      throw new NotFoundException(QUEUE_ERRORS.TOKEN_NOT_FOUND);
    }

    if (token.tenantId !== tenantId) {
      throw new ForbiddenException(QUEUE_ERRORS.CROSS_TENANT);
    }

    // Check if WAITING
    if (!CALLABLE_STATUSES.includes(token.status as any)) {
      throw new BadRequestException({
        ...QUEUE_ERRORS.CANNOT_CALL,
        details: { currentStatus: token.status },
      });
    }

    // Check no other IN_PROGRESS
    const today = startOfDay(new Date());
    const currentToken =
      await this.queueRepository.getCurrentToken(
        tenantId,
        token.doctorProfileId,
        today,
      );

    if (currentToken) {
      throw new BadRequestException({
        ...QUEUE_ERRORS.ANOTHER_IN_PROGRESS,
        details: {
          currentTokenNumber: currentToken.tokenNumber,
        },
      });
    }

    // Update token
    const updatedToken = await this.queueRepository.updateStatus(
      tokenId,
      'IN_PROGRESS',
      {
        calledAt: new Date(),
        startedAt: new Date(),
      },
    );

    // Update appointment
    await this.queueRepository.updateAppointmentStatus(
      token.appointmentId,
      'IN_CONSULTATION',
    );

    this.logger.log(`Token #${token.tokenNumber} called directly`);

    return this.toQueueToken(updatedToken);
  }

  // ─── SKIP TOKEN ─────────────────────────────────────────────────
  // Patient not present → move to end of queue
  async skipToken(
    tenantId: string,
    tokenId: string,
  ): Promise<QueueTokenDto> {
    const token = await this.queueRepository.findById(
      tenantId,
      tokenId,
    );

    if (!token) {
      throw new NotFoundException(QUEUE_ERRORS.TOKEN_NOT_FOUND);
    }

    if (!SKIPPABLE_STATUSES.includes(token.status as any)) {
      throw new BadRequestException({
        ...QUEUE_ERRORS.CANNOT_SKIP,
        details: { currentStatus: token.status },
      });
    }

    // Set status back to WAITING (moved to end by token number)
    // Preserve original position for analytics
    const updatedToken = await this.queueRepository.updateStatus(
      tokenId,
      'SKIPPED',
      {
        calledAt: null,
        startedAt: null,
      },
    );

    // Revert appointment status
    await this.queueRepository.updateAppointmentStatus(
      token.appointmentId,
      'IN_QUEUE',
    );

    this.logger.log(`Token #${token.tokenNumber} skipped`);

    return this.toQueueToken(updatedToken);
  }

  // ─── RE-QUEUE SKIPPED TOKEN ─────────────────────────────────────
  // Put skipped patient back in WAITING queue
  async requeueToken(
    tenantId: string,
    tokenId: string,
  ): Promise<QueueTokenDto> {
    const token = await this.queueRepository.findById(
      tenantId,
      tokenId,
    );

    if (!token) {
      throw new NotFoundException(QUEUE_ERRORS.TOKEN_NOT_FOUND);
    }

    if (token.status !== 'SKIPPED') {
      throw new BadRequestException({
        code: 'OPD_QUE_012',
        message: 'Only SKIPPED tokens can be re-queued',
        details: { currentStatus: token.status },
      });
    }

    const updatedToken = await this.queueRepository.updateStatus(
      tokenId,
      'WAITING',
    );

    this.logger.log(`Token #${token.tokenNumber} re-queued`);

    return this.toQueueToken(updatedToken);
  }

  // ─── COMPLETE TOKEN ─────────────────────────────────────────────
  // Doctor finishes consultation
  async completeToken(
    tenantId: string,
    tokenId: string,
  ): Promise<QueueTokenDto> {
    const token = await this.queueRepository.findById(
      tenantId,
      tokenId,
    );

    if (!token) {
      throw new NotFoundException(QUEUE_ERRORS.TOKEN_NOT_FOUND);
    }

    if (!COMPLETABLE_STATUSES.includes(token.status as any)) {
      throw new BadRequestException({
        ...QUEUE_ERRORS.CANNOT_COMPLETE,
        details: { currentStatus: token.status },
      });
    }

    // Update token
    const updatedToken = await this.queueRepository.updateStatus(
      tokenId,
      'COMPLETED',
      { completedAt: new Date() },
    );

    // Update appointment
    await this.queueRepository.updateAppointmentStatus(
      token.appointmentId,
      'COMPLETED',
    );

    this.logger.log(`Token #${token.tokenNumber} completed`);

    return this.toQueueToken(updatedToken);
  }

  // ─── CANCEL TOKEN ──────────────────────────────────────────────
  async cancelToken(
    tenantId: string,
    tokenId: string,
  ): Promise<QueueTokenDto> {
    const token = await this.queueRepository.findById(
      tenantId,
      tokenId,
    );

    if (!token) {
      throw new NotFoundException(QUEUE_ERRORS.TOKEN_NOT_FOUND);
    }

    if (!CANCELLABLE_STATUSES.includes(token.status as any)) {
      throw new BadRequestException({
        ...QUEUE_ERRORS.CANNOT_CANCEL,
        details: { currentStatus: token.status },
      });
    }

    const updatedToken = await this.queueRepository.updateStatus(
      tokenId,
      'CANCELLED',
    );

    this.logger.log(`Token #${token.tokenNumber} cancelled`);

    return this.toQueueToken(updatedToken);
  }

  // ─── GET QUEUE STATS ────────────────────────────────────────────
  async getStats(
    tenantId: string,
    doctorProfileId: string,
    date?: string,
  ): Promise<QueueStatsDto> {
    const queryDate = date ? new Date(date) : new Date();
    return this.queueRepository.getQueueStats(
      tenantId,
      doctorProfileId,
      queryDate,
    );
  }

  // ─── GET DISPLAY BOARD DATA ─────────────────────────────────────
  // For OPD TV/Display showing current token per doctor
  async getDisplayBoard(tenantId: string): Promise<DisplayBoardDto> {
    const today = startOfDay(new Date());

    const allTokens = await this.queueRepository.getDisplayBoardData(
      tenantId,
      today,
    );

    // Group tokens by doctor
    const doctorMap = new Map<string, any>();

    for (const token of allTokens) {
      const docId = token.doctorProfileId;

      if (!doctorMap.has(docId)) {
        const user = token.doctorProfile.hospitalUser;
        doctorMap.set(docId, {
          doctorName: [user.firstName, user.lastName]
            .filter(Boolean)
            .join(' '),
          specialization: token.doctorProfile.specialization,
          roomNo: token.roomNo,
          currentToken: null as number | null,
          currentPatientName: null as string | null,
          nextTokens: [] as number[],
          totalWaiting: 0,
        });
      }

      const doc = doctorMap.get(docId);

      if (token.status === 'IN_PROGRESS') {
        doc.currentToken = token.tokenNumber;
        const p = token.appointment?.patient;
        doc.currentPatientName = p
          ? [p.firstName, p.lastName].filter(Boolean).join(' ')
          : null;
      }

      if (token.status === 'WAITING') {
        doc.totalWaiting++;
        if (doc.nextTokens.length < 3) {
          doc.nextTokens.push(token.tokenNumber);
        }
      }
    }

    return {
      hospitalName: '', // Will be filled by controller from tenant
      date: format(today, 'yyyy-MM-dd'),
      doctors: Array.from(doctorMap.values()),
    };
  }

  // ─── GET TOKEN BY ID ────────────────────────────────────────────
  async getTokenById(
    tenantId: string,
    tokenId: string,
  ): Promise<QueueTokenDto> {
    const token = await this.queueRepository.findById(
      tenantId,
      tokenId,
    );

    if (!token) {
      throw new NotFoundException(QUEUE_ERRORS.TOKEN_NOT_FOUND);
    }

    return this.toQueueToken(token);
  }

  // ═══════════════════════════════════════════════════════════════
  //  PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════

  // Calculate estimated consultation time for new token
  private async calculateEstimatedTime(
    tenantId: string,
    doctorProfileId: string,
    date: Date,
    tokenNumber: number,
    slotDurationMins: number,
  ): Promise<string | null> {
    // Count how many waiting tokens are ahead
    const tokensAhead =
      await this.queueRepository.countWaitingAhead(
        tenantId,
        doctorProfileId,
        date,
        tokenNumber,
      );

    if (tokensAhead === 0) {
      return null; // You're next — no estimated time
    }

    // Estimate: each token takes slotDurationMins
    const waitMins = tokensAhead * slotDurationMins;
    const now = new Date();
    const estimatedDate = new Date(
      now.getTime() + waitMins * 60 * 1000,
    );

    const hours = estimatedDate.getHours().toString().padStart(2, '0');
    const mins = estimatedDate.getMinutes().toString().padStart(2, '0');

    return `${hours}:${mins}`;
  }

  // Map DB entity to response DTO
  private toQueueToken(token: any): QueueTokenDto {
    const appointment = token.appointment;
    const patient = appointment?.patient;

    // Calculate wait time
    let waitTimeMins: number | null = null;
    if (token.calledAt && token.createdAt) {
      const diffMs =
        new Date(token.calledAt).getTime() -
        new Date(token.createdAt).getTime();
      waitTimeMins = Math.round(diffMs / (1000 * 60));
    }

    return {
      id: token.id,
      tokenNumber: token.tokenNumber,
      status: token.status,
      originalPosition: token.originalPosition,
      estimatedTime: token.estimatedTime,
      calledAt: token.calledAt,
      startedAt: token.startedAt,
      completedAt: token.completedAt,
      roomNo: token.roomNo,
      appointmentId: appointment?.id ?? token.appointmentId,
      appointmentNo: appointment?.appointmentNo ?? '',
      appointmentType: appointment?.appointmentType ?? '',
      visitType: appointment?.visitType ?? '',
      priority: appointment?.priority ?? 0,
      reasonForVisit: appointment?.reasonForVisit ?? null,
      patient: patient
        ? {
            id: patient.id,
            uhid: patient.uhid,
            firstName: patient.firstName,
            lastName: patient.lastName,
            fullName: [patient.firstName, patient.lastName]
              .filter(Boolean)
              .join(' '),
            mobile: patient.mobile,
            age: patient.age,
            ageUnit: patient.ageUnit,
            gender: patient.gender,
            allergies: patient.allergies,
            chronicDiseases: patient.chronicDiseases,
          }
        : {
            id: '',
            uhid: '',
            firstName: 'Unknown',
            lastName: null,
            fullName: 'Unknown',
            mobile: '',
            age: null,
            ageUnit: null,
            gender: '',
            allergies: null,
            chronicDiseases: null,
          },
      vitalsRecorded: false, // Will be updated in Step 4
      waitTimeMins,
    };
  }

  // Map to simple token response
  private toTokenResponse(token: any): TokenResponseDto {
    const appointment = token.appointment;
    const patient = appointment?.patient;
    const doctor = token.doctorProfile;
    const doctorUser = doctor?.hospitalUser;

    return {
      id: token.id,
      tokenNumber: token.tokenNumber,
      tokenDate: format(token.tokenDate, 'yyyy-MM-dd'),
      status: token.status,
      estimatedTime: token.estimatedTime,
      roomNo: token.roomNo,
      appointmentNo: appointment?.appointmentNo ?? '',
      patient: {
        uhid: patient?.uhid ?? '',
        firstName: patient?.firstName ?? 'Unknown',
        lastName: patient?.lastName ?? null,
        fullName: [patient?.firstName, patient?.lastName]
          .filter(Boolean)
          .join(' '),
      },
      doctor: {
        firstName: doctorUser?.firstName ?? '',
        lastName: doctorUser?.lastName ?? null,
        specialization: doctor?.specialization ?? '',
      },
    };
  }
}