import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PG_EXCLUSION_VIOLATION,
  PG_UNIQUE_VIOLATION,
  postgresErrorCode,
} from '../common/database-errors.js';
import { addDays, kyivClock, kyivTime } from '../common/time/kyiv-time.js';
import { EventBus } from '../events/event-bus.js';
import type { Prisma } from '../generated/prisma/client.js';
import { formatWhen } from '../notifications/templates/notification-template.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  AdminSessionDto,
  CancelSessionResultDto,
  CreateSessionsDto,
  SessionQueryDto,
} from './dto/admin-schedule.dto.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const ACTIVE: Prisma.BookingWhereInput = { status: { in: ['PENDING', 'CONFIRMED'] } };

const SESSION_INCLUDE = {
  section: { select: { id: true, name: true, center: { select: { id: true, name: true } } } },
  hall: { select: { id: true, name: true } },
  trainer: { select: { id: true, fullName: true } },
  _count: { select: { bookings: { where: ACTIVE } } },
} as const satisfies Prisma.GroupSessionInclude;

type SessionRow = Prisma.GroupSessionGetPayload<{ include: typeof SESSION_INCLUDE }>;

/** The administrator's timetable: scheduling group sessions and calling them off. */
@Injectable()
export class AdminScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventBus,
  ) {}

  async list({ sectionId, centerId, days = 14 }: SessionQueryDto): Promise<AdminSessionDto[]> {
    const now = new Date();
    const rows = await this.prisma.groupSession.findMany({
      where: {
        sectionId,
        ...(centerId && { section: { centerId } }),
        endsAt: { gt: now },
        startsAt: { lt: new Date(now.getTime() + days * DAY_MS) },
      },
      orderBy: { startsAt: 'asc' },
      take: 300,
      include: SESSION_INCLUDE,
    });
    return rows.map(toSessionDto);
  }

  /**
   * Schedules one session, or the same Kyiv time every week for
   * `repeatWeeks` weeks. Each session and its hall/trainer occupancy are
   * written together; the exclusion constraints reject any overlap, and
   * then nothing of the series is saved.
   */
  async create(dto: CreateSessionsDto): Promise<AdminSessionDto[]> {
    const now = new Date();
    const section = await this.prisma.section.findFirst({
      where: { id: dto.sectionId, isActive: true },
      include: { center: true },
    });
    if (!section) throw new NotFoundException('Секцію не знайдено');
    const hall = await this.prisma.hall.findFirst({
      where: { id: dto.hallId, centerId: section.centerId, isActive: true },
    });
    if (!hall) throw new BadRequestException('Оберіть активний зал цього центру');
    const trainerId = dto.trainerId === undefined ? section.trainerId : dto.trainerId;
    if (
      trainerId &&
      !(await this.prisma.trainer.count({
        where: { id: trainerId, centerId: section.centerId, isActive: true },
      }))
    ) {
      throw new BadRequestException('Оберіть активного тренера цього центру');
    }
    const capacity = dto.capacity ?? section.capacity;
    if (capacity > hall.capacity) {
      throw new BadRequestException(`У залі «${hall.name}» вміщується до ${hall.capacity} осіб`);
    }

    const first = kyivClock(dto.startsAt);
    const times = Array.from({ length: dto.repeatWeeks ?? 1 }, (_, week) => {
      // Same wall-clock time each week, also across a daylight saving switch.
      const startsAt = kyivTime(addDays(first.date, week * 7), first.hour, first.minute);
      return { startsAt, endsAt: new Date(startsAt.getTime() + dto.durationMinutes * 60_000) };
    });
    for (const { startsAt, endsAt } of times) {
      if (startsAt <= now) throw new BadRequestException('Заняття має бути в майбутньому');
      if (!withinOpeningHours(startsAt, endsAt, section.center)) {
        throw new BadRequestException(
          `${section.center.name} працює з ${section.center.openHour}:00 до ${section.center.closeHour}:00`,
        );
      }
    }

    let current = times[0].startsAt;
    try {
      const ids = await this.prisma.$transaction(async (tx) => {
        const created: string[] = [];
        for (const { startsAt, endsAt } of times) {
          current = startsAt;
          const session = await tx.groupSession.create({
            data: { sectionId: section.id, hallId: hall.id, trainerId, startsAt, endsAt, capacity },
          });
          await tx.occupancy.create({
            data: { hallId: hall.id, trainerId, startsAt, endsAt, groupSessionId: session.id },
          });
          created.push(session.id);
        }
        return created;
      });
      const rows = await this.prisma.groupSession.findMany({
        where: { id: { in: ids } },
        orderBy: { startsAt: 'asc' },
        include: SESSION_INCLUDE,
      });
      return rows.map(toSessionDto);
    } catch (error) {
      const code = postgresErrorCode(error);
      if (code === PG_EXCLUSION_VIOLATION) {
        throw new ConflictException(`Зал або тренер зайняті: ${formatWhen(current)}`);
      }
      if (code === PG_UNIQUE_VIOLATION) {
        throw new ConflictException(`Заняття цієї секції вже є: ${formatWhen(current)}`);
      }
      throw error;
    }
  }

  /**
   * Calls a session off. The session is closed to new bookings and its
   * hall and trainer time is freed in one transaction; then the fact is
   * published and the booking subsystem cancels the bookings (Observer).
   * Sending the request again for a cancelled session retries the
   * bookings that could not be cancelled the first time.
   */
  async cancel(id: string, reason: string): Promise<CancelSessionResultDto> {
    const session = await this.prisma.groupSession.findUnique({
      where: { id },
      include: { section: { select: { name: true } } },
    });
    if (!session) throw new NotFoundException('Заняття не знайдено');
    if (session.startsAt <= new Date()) {
      throw new ConflictException('Заняття вже почалося або минуло');
    }

    await this.prisma.$transaction([
      // Conditional: a booking that takes a seat locks the row, so it either
      // finished before this (and is cancelled below) or sees the session cancelled.
      this.prisma.groupSession.updateMany({
        where: { id, isCancelled: false },
        data: { isCancelled: true },
      }),
      this.prisma.occupancy.deleteMany({ where: { groupSessionId: id } }),
    ]);

    const activeBefore = await this.activeBookings(id);
    await this.events.publish({
      type: 'session.cancelled',
      sessionId: id,
      title: session.section.name,
      startsAt: session.startsAt,
      reason: reason.trim(),
    });
    const stillActive = await this.activeBookings(id);

    const row = await this.prisma.groupSession.findUniqueOrThrow({
      where: { id },
      include: SESSION_INCLUDE,
    });
    return {
      session: toSessionDto(row),
      cancelledBookings: activeBefore - stillActive,
      stillActive,
    };
  }

  private activeBookings(groupSessionId: string): Promise<number> {
    return this.prisma.booking.count({ where: { groupSessionId, ...ACTIVE } });
  }
}

/** The whole session lies inside the center's opening hours (Kyiv time). */
function withinOpeningHours(
  startsAt: Date,
  endsAt: Date,
  center: { openHour: number; closeHour: number },
): boolean {
  const start = kyivClock(startsAt);
  const end = kyivClock(endsAt);
  const startHours = start.hour + start.minute / 60;
  // Midnight right after the last hour counts as 24:00 of the same day.
  const endHours =
    end.date === start.date
      ? end.hour + end.minute / 60
      : end.hour === 0 && end.minute === 0
        ? 24
        : Infinity;
  return startHours >= center.openHour && endHours <= center.closeHour;
}

function toSessionDto(row: SessionRow): AdminSessionDto {
  return {
    id: row.id,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    capacity: row.capacity,
    bookedCount: row.bookedCount,
    isCancelled: row.isCancelled,
    section: { id: row.section.id, name: row.section.name },
    center: row.section.center,
    hall: row.hall,
    trainer: row.trainer,
    activeBookings: row._count.bookings,
  };
}
