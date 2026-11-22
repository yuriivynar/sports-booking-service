import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { BookingRequest } from '../booking-request.js';
import { BookingCreator, BookingDraft, type ReservedBooking, type Tx } from './booking-creator.js';
import { releaseOccupancy, takeOccupancy } from './occupancy.js';

/** A personal session always lasts one hour. */
const SESSION_MS = 60 * 60 * 1000;

export class PersonalTrainingDraft extends BookingDraft {
  readonly type = 'PERSONAL_TRAINING';
  readonly usesHourlyGrid = true;

  reserve(tx: Tx, bookingId: string): Promise<void> {
    return takeOccupancy(
      tx,
      { bookingId, trainerId: this.trainerId!, startsAt: this.startsAt, endsAt: this.endsAt },
      'Тренер на цей час уже зайнятий',
    );
  }
}

/** Books one hour with a trainer. */
@Injectable()
export class PersonalTrainingCreator extends BookingCreator {
  readonly type = 'PERSONAL_TRAINING';
  protected readonly targetField = 'trainerId';

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected async createDraft(trainerId: string, request: BookingRequest): Promise<BookingDraft> {
    const startsAt = this.requireStart(request);
    const trainer = await this.prisma.trainer.findFirst({
      where: { id: trainerId, isActive: true },
      include: { center: true, sports: { select: { id: true } } },
    });
    if (!trainer) throw new NotFoundException('Тренера не знайдено');

    return new PersonalTrainingDraft({
      title: `Персональне тренування: ${trainer.fullName}`,
      startsAt,
      endsAt: new Date(startsAt.getTime() + SESSION_MS),
      basePrice: trainer.sessionPrice,
      center: trainer.center,
      sportIds: trainer.sports.map((sport) => sport.id),
      hallKind: null,
      hallId: null,
      trainerId: trainer.id,
      groupSessionId: null,
      seats: null,
    });
  }

  release(tx: Tx, booking: ReservedBooking): Promise<void> {
    return releaseOccupancy(tx, booking.id);
  }
}
