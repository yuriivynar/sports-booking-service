import { BadRequestException, ConflictException } from '@nestjs/common';
import { kyivClock } from '../../common/time/kyiv-time.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import { BookingValidator, type ValidationContext } from './booking-validator.js';

/** How far ahead bookings are accepted. */
export const BOOKING_HORIZON_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED'] as const;

/** The activity starts in the future, within the booking horizon. */
export class FutureStartValidator extends BookingValidator {
  protected check({ draft, now }: ValidationContext): void {
    if (draft.startsAt <= now) {
      throw new BadRequestException('Цей час уже минув');
    }
    if (draft.startsAt.getTime() - now.getTime() > BOOKING_HORIZON_DAYS * DAY_MS) {
      throw new BadRequestException(
        `Бронювати можна не більше ніж на ${BOOKING_HORIZON_DAYS} днів наперед`,
      );
    }
  }
}

/** Rentals and personal sessions start on the hour and fit into the center's opening hours. */
export class OpeningHoursValidator extends BookingValidator {
  protected check({ draft }: ValidationContext): void {
    if (!draft.usesHourlyGrid) return;
    const { openHour, closeHour } = draft.center;
    const start = kyivClock(draft.startsAt);
    const end = kyivClock(draft.endsAt);
    // Midnight after the last hour counts as 24:00 of the same day.
    const endHour = end.date === start.date ? end.hour : end.hour === 0 ? 24 : Infinity;

    if (start.minute !== 0 || end.minute !== 0) {
      throw new BadRequestException('Бронювання починається на початку години');
    }
    if (start.hour < openHour || endHour > closeHour) {
      throw new BadRequestException(
        `${draft.center.name} працює з ${openHour}:00 до ${closeHour}:00`,
      );
    }
  }
}

/** A group session is not cancelled and still has free places. */
export class CapacityValidator extends BookingValidator {
  protected check({ draft }: ValidationContext): void {
    if (!draft.seats) return;
    if (draft.seats.cancelled) throw new ConflictException('Заняття скасовано');
    if (draft.seats.booked >= draft.seats.capacity) {
      throw new ConflictException('Вільних місць більше немає');
    }
  }
}

/** The chosen membership is active and covers this activity. */
export class MembershipValidator extends BookingValidator {
  protected check({ draft, membership }: ValidationContext): void {
    if (!membership) return;
    const fail = (message: string) => new BadRequestException(message);

    if (draft.type !== 'GROUP_SESSION') throw fail('Абонемент діє лише на групові заняття');
    if (membership.status !== 'ACTIVE') throw fail('Абонемент неактивний');
    const startsBefore = !membership.startsAt || membership.startsAt <= draft.startsAt;
    const endsAfter = !membership.endsAt || draft.startsAt < membership.endsAt;
    if (!startsBefore || !endsAfter) throw fail('Абонемент не діє на дату заняття');
    if (membership.visitsLeft === 0) throw fail('На абонементі не лишилося відвідувань');
    const { sportId, centerId } = membership.plan;
    if (sportId && !draft.sportIds.includes(sportId)) {
      throw fail('Абонемент не діє на цей вид спорту');
    }
    if (centerId && centerId !== draft.center.id) throw fail('Абонемент не діє в цьому центрі');
  }
}

/** The hall or trainer is free at that time. */
export class AvailabilityValidator extends BookingValidator {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  protected async check({ draft }: ValidationContext): Promise<void> {
    if (!draft.hallId && !draft.trainerId) return;
    const busy = await this.prisma.occupancy.findFirst({
      where: {
        ...(draft.hallId ? { hallId: draft.hallId } : { trainerId: draft.trainerId }),
        startsAt: { lt: draft.endsAt },
        endsAt: { gt: draft.startsAt },
      },
      select: { id: true },
    });
    if (busy) {
      throw new ConflictException(
        draft.hallId ? 'Зал на цей час уже зайнятий' : 'Тренер на цей час уже зайнятий',
      );
    }
  }
}

/** The user has no other active booking at the same time. */
export class NoDuplicateValidator extends BookingValidator {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  protected async check({ draft, userId }: ValidationContext): Promise<void> {
    const overlapping = await this.prisma.booking.findFirst({
      where: {
        userId,
        status: { in: [...ACTIVE_STATUSES] },
        startsAt: { lt: draft.endsAt },
        endsAt: { gt: draft.startsAt },
      },
      select: { groupSessionId: true },
    });
    if (!overlapping) return;
    throw new ConflictException(
      draft.groupSessionId && overlapping.groupSessionId === draft.groupSessionId
        ? 'Ви вже записані на це заняття'
        : 'У вас уже є бронювання на цей час',
    );
  }
}
