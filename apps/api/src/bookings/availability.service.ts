import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { addDays, kyivDateString, kyivTime } from '../common/time/kyiv-time.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { BookingFacade } from './booking.facade.js';
import type { AvailabilityDto } from './dto/booking.dto.js';
import { BOOKING_HORIZON_DAYS } from './validation/validators.js';

const HOUR_MS = 60 * 60 * 1000;

type Resource = { hallId: string } | { trainerId: string };

/** Hourly slots of a hall or trainer for one day, for the slot pickers. */
@Injectable()
export class AvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly facade: BookingFacade,
  ) {}

  async forHall(hallId: string, date: string): Promise<AvailabilityDto> {
    const hall = await this.prisma.hall.findFirst({
      where: { id: hallId, isActive: true },
      select: { hourlyPrice: true, center: { select: { openHour: true, closeHour: true } } },
    });
    if (!hall) throw new NotFoundException('Зал не знайдено');
    return this.slots({ hallId }, date, hall.center, hall.hourlyPrice);
  }

  async forTrainer(trainerId: string, date: string): Promise<AvailabilityDto> {
    const trainer = await this.prisma.trainer.findFirst({
      where: { id: trainerId, isActive: true },
      select: { sessionPrice: true, center: { select: { openHour: true, closeHour: true } } },
    });
    if (!trainer) throw new NotFoundException('Тренера не знайдено');
    return this.slots({ trainerId }, date, trainer.center, trainer.sessionPrice);
  }

  private async slots(
    resource: Resource,
    date: string,
    hours: { openHour: number; closeHour: number },
    pricePerHour: number,
  ): Promise<AvailabilityDto> {
    // The regex in the DTO lets 2026-02-31 through: check the date exists.
    const parsed = new Date(`${date}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
      throw new BadRequestException('Такої дати не існує');
    }
    const now = new Date();
    const today = kyivDateString(now);
    if (date < today || date > addDays(today, BOOKING_HORIZON_DAYS)) {
      throw new BadRequestException(`Оберіть дату на найближчі ${BOOKING_HORIZON_DAYS} днів`);
    }
    // Expired holds must not show as busy.
    await this.facade.releaseExpiredHolds(now);

    const dayStart = kyivTime(date, hours.openHour);
    const dayEnd = kyivTime(date, hours.closeHour);
    const busy = await this.prisma.occupancy.findMany({
      where: { ...resource, startsAt: { lt: dayEnd }, endsAt: { gt: dayStart } },
      select: { startsAt: true, endsAt: true },
    });

    const slots = [];
    for (let hour = hours.openHour; hour < hours.closeHour; hour++) {
      const startsAt = kyivTime(date, hour);
      const endsAt = new Date(startsAt.getTime() + HOUR_MS);
      const taken = busy.some((b) => b.startsAt < endsAt && b.endsAt > startsAt);
      slots.push({ startsAt, endsAt, available: startsAt > now && !taken });
    }
    return { date, ...hours, pricePerHour, slots };
  }
}
