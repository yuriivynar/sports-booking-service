import { Injectable } from '@nestjs/common';
import { BookingFacade } from '../bookings/booking.facade.js';
import { BOOKING_INCLUDE, bookingTitle } from '../bookings/booking.mapper.js';
import { EventBus } from '../events/event-bus.js';
import { MembershipsService } from '../memberships/memberships.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { JobRunDto } from './dto/job-run.dto.js';

const HOUR_MS = 60 * 60 * 1000;
/** Supabase Cron calls the job every 15 minutes; one run handles at most this many reminders. */
const REMINDER_BATCH = 100;

type ReminderColumn = 'reminder24hSentAt' | 'reminder2hSentAt';

/** Housekeeping that runs on a schedule and on the admin's "run now" button. */
@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bookings: BookingFacade,
    private readonly memberships: MembershipsService,
    private readonly events: EventBus,
  ) {}

  async runMaintenance(now: Date = new Date()): Promise<JobRunDto> {
    const started = Date.now();
    const releasedHolds = await this.bookings.releaseExpiredHolds(now);
    const completedBookings = await this.bookings.completeFinishedBookings(now);
    const expiredMemberships = await this.memberships.expireEnded(now);
    // The 2-hour reminder first: a booking made 3 hours ahead gets only that one.
    const reminders2h = await this.sendReminders(now, 2, 'reminder2hSentAt');
    const reminders24h = await this.sendReminders(now, 24, 'reminder24hSentAt');
    return {
      releasedHolds,
      completedBookings,
      expiredMemberships,
      reminders24h,
      reminders2h,
      startedAt: now,
      durationMs: Date.now() - started,
    };
  }

  /**
   * Reminds about confirmed bookings that start within `hours`. The
   * "sent" column is set with a conditional update before the event is
   * published, so two overlapping runs never remind twice.
   */
  private async sendReminders(now: Date, hours: 24 | 2, column: ReminderColumn): Promise<number> {
    const due = await this.prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        [column]: null,
        startsAt: {
          gt: hours === 24 ? new Date(now.getTime() + 2 * HOUR_MS) : now,
          lte: new Date(now.getTime() + hours * HOUR_MS),
        },
      },
      include: BOOKING_INCLUDE,
      orderBy: { startsAt: 'asc' },
      take: REMINDER_BATCH,
    });
    let sent = 0;
    for (const booking of due) {
      const { count } = await this.prisma.booking.updateMany({
        where: { id: booking.id, [column]: null },
        data: {
          [column]: now,
          // A 2-hour reminder makes the 24-hour one pointless.
          ...(hours === 2 && { reminder24hSentAt: booking.reminder24hSentAt ?? now }),
        },
      });
      if (count === 0) continue;
      sent++;
      await this.events.publish({
        type: 'booking.reminder',
        hoursBefore: hours,
        bookingId: booking.id,
        userId: booking.userId,
        bookingType: booking.type,
        title: bookingTitle(booking),
        startsAt: booking.startsAt,
      });
    }
    return sent;
  }
}
