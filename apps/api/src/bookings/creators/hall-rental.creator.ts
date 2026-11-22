import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { BookingRequest } from '../booking-request.js';
import { BookingCreator, BookingDraft, type ReservedBooking, type Tx } from './booking-creator.js';
import { releaseOccupancy, takeOccupancy } from './occupancy.js';

export const MAX_RENTAL_HOURS = 4;
const HOUR_MS = 60 * 60 * 1000;

export class HallRentalDraft extends BookingDraft {
  readonly type = 'HALL_RENTAL';
  readonly usesHourlyGrid = true;

  reserve(tx: Tx, bookingId: string): Promise<void> {
    return takeOccupancy(
      tx,
      { bookingId, hallId: this.hallId!, startsAt: this.startsAt, endsAt: this.endsAt },
      'Зал на цей час уже зайнятий',
    );
  }
}

/** Rents a whole hall for one or more hours. */
@Injectable()
export class HallRentalCreator extends BookingCreator {
  readonly type = 'HALL_RENTAL';
  protected readonly targetField = 'hallId';

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected async createDraft(hallId: string, request: BookingRequest): Promise<BookingDraft> {
    const startsAt = this.requireStart(request);
    const hours = request.hours ?? 1;
    if (!Number.isInteger(hours) || hours < 1 || hours > MAX_RENTAL_HOURS) {
      throw new BadRequestException(`Оренда триває від 1 до ${MAX_RENTAL_HOURS} годин`);
    }
    const hall = await this.prisma.hall.findFirst({
      where: { id: hallId, isActive: true },
      include: { center: true, sports: { select: { id: true } } },
    });
    if (!hall) throw new NotFoundException('Зал не знайдено');

    return new HallRentalDraft({
      title: `Оренда: ${hall.name}`,
      startsAt,
      endsAt: new Date(startsAt.getTime() + hours * HOUR_MS),
      basePrice: hall.hourlyPrice * hours,
      center: hall.center,
      sportIds: hall.sports.map((sport) => sport.id),
      hallKind: hall.kind,
      hallId: hall.id,
      trainerId: null,
      groupSessionId: null,
      seats: null,
    });
  }

  release(tx: Tx, booking: ReservedBooking): Promise<void> {
    return releaseOccupancy(tx, booking.id);
  }
}
