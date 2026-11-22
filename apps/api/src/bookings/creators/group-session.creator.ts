import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { BookingCreator, BookingDraft, type ReservedBooking, type Tx } from './booking-creator.js';

export class GroupSessionDraft extends BookingDraft {
  readonly type = 'GROUP_SESSION';
  readonly usesHourlyGrid = false;

  /**
   * Takes a seat with one conditional UPDATE: the row changes only while
   * booked_count < capacity. Postgres locks the row for the update, so of
   * two requests for the last seat exactly one sees count = 1.
   */
  async reserve(tx: Tx): Promise<void> {
    const { count } = await tx.groupSession.updateMany({
      where: {
        id: this.groupSessionId!,
        isCancelled: false,
        bookedCount: { lt: tx.groupSession.fields.capacity },
      },
      data: { bookedCount: { increment: 1 } },
    });
    if (count === 0) throw new ConflictException('Вільних місць більше немає');
  }
}

/** Books a seat in a scheduled session of a section. */
@Injectable()
export class GroupSessionCreator extends BookingCreator {
  readonly type = 'GROUP_SESSION';
  protected readonly targetField = 'groupSessionId';

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected async createDraft(sessionId: string): Promise<BookingDraft> {
    const session = await this.prisma.groupSession.findUnique({
      where: { id: sessionId },
      include: { section: { include: { center: true } }, hall: { select: { kind: true } } },
    });
    if (!session || !session.section.isActive) throw new NotFoundException('Заняття не знайдено');

    return new GroupSessionDraft({
      title: session.section.name,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      basePrice: session.section.sessionPrice,
      center: session.section.center,
      sportIds: [session.section.sportId],
      hallKind: session.hall.kind,
      // The session already holds its hall and trainer; a booking takes a seat.
      hallId: null,
      trainerId: null,
      groupSessionId: session.id,
      seats: {
        capacity: session.capacity,
        booked: session.bookedCount,
        cancelled: session.isCancelled,
      },
    });
  }

  async release(tx: Tx, booking: ReservedBooking): Promise<void> {
    await tx.groupSession.updateMany({
      where: { id: booking.groupSessionId!, bookedCount: { gt: 0 } },
      data: { bookedCount: { decrement: 1 } },
    });
  }
}
