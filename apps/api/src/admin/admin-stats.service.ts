import { Injectable } from '@nestjs/common';
import { addDays, kyivDateString, kyivTime } from '../common/time/kyiv-time.js';
import { LoyaltyTier } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AdminStatsDto, DailyStatDto } from './dto/admin-stats.dto.js';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Occupancy also looks this far ahead: the timetable is mostly in the future. */
const OCCUPANCY_AHEAD_DAYS = 14;
const TOP_SPORTS = 8;

type DayRow = { day: string; bookings: bigint; cancelled: bigint };
type RevenueRow = { day: string; revenue: bigint };
type CenterRow = { center_id: string; name: string; capacity: bigint; booked: bigint };
type SportRow = { slug: string; name: string; bookings: bigint };

/**
 * Numbers for the admin dashboard. Each figure is one aggregate query; the
 * database groups by Kyiv calendar day, and the days with nothing are
 * filled in here so a chart shows them as zeros rather than skipping them.
 */
@Injectable()
export class AdminStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async stats(days = 30, now = new Date()): Promise<AdminStatsDto> {
    const to = kyivDateString(now);
    const from = addDays(to, -(days - 1));
    const since = kyivTime(from, 0);
    const until = new Date(now.getTime() + OCCUPANCY_AHEAD_DAYS * DAY_MS);

    const [perDay, revenuePerDay, centers, sports, tiers, types, clients, checks] =
      await Promise.all([
        this.prisma.$queryRaw<DayRow[]>`
          SELECT to_char(created_at AT TIME ZONE 'Europe/Kyiv', 'YYYY-MM-DD') AS day,
                 count(*) FILTER (WHERE status <> 'CANCELLED') AS bookings,
                 count(*) FILTER (WHERE status = 'CANCELLED') AS cancelled
          FROM bookings
          WHERE created_at >= ${since}
          GROUP BY 1`,
        // REFUNDED payments drop out, so this is money kept.
        this.prisma.$queryRaw<RevenueRow[]>`
          SELECT to_char(created_at AT TIME ZONE 'Europe/Kyiv', 'YYYY-MM-DD') AS day,
                 sum(amount) AS revenue
          FROM payments
          WHERE status = 'SUCCEEDED' AND created_at >= ${since}
          GROUP BY 1`,
        this.prisma.$queryRaw<CenterRow[]>`
          SELECT c.id AS center_id, c.name,
                 sum(gs.capacity) AS capacity, sum(gs.booked_count) AS booked
          FROM group_sessions gs
          JOIN sections s ON s.id = gs.section_id
          JOIN sport_centers c ON c.id = s.center_id
          WHERE NOT gs.is_cancelled AND gs.starts_at >= ${since} AND gs.starts_at < ${until}
          GROUP BY c.id, c.name
          ORDER BY c.name`,
        this.prisma.$queryRaw<SportRow[]>`
          SELECT sp.slug, sp.name, count(*) AS bookings
          FROM bookings b
          JOIN group_sessions gs ON gs.id = b.group_session_id
          JOIN sections s ON s.id = gs.section_id
          JOIN sports sp ON sp.id = s.sport_id
          WHERE b.status IN ('CONFIRMED', 'COMPLETED') AND b.created_at >= ${since}
          GROUP BY sp.slug, sp.name
          ORDER BY bookings DESC, sp.name
          LIMIT ${TOP_SPORTS}`,
        this.prisma.user.groupBy({
          by: ['loyaltyTier'],
          where: { role: 'CLIENT' },
          _count: { _all: true },
        }),
        this.prisma.booking.groupBy({
          by: ['type'],
          where: { status: { in: ['CONFIRMED', 'COMPLETED'] }, createdAt: { gte: since } },
          _count: { _all: true },
        }),
        this.prisma.booking.findMany({
          where: { status: { in: ['CONFIRMED', 'COMPLETED'] }, createdAt: { gte: since } },
          distinct: ['userId'],
          select: { userId: true },
        }),
        this.prisma.payment.aggregate({
          where: { status: 'SUCCEEDED', bookingId: { not: null }, createdAt: { gte: since } },
          _avg: { amount: true },
        }),
      ]);

    const daily = fillDays(from, days, perDay, revenuePerDay);
    const tierCounts = new Map(tiers.map((row) => [row.loyaltyTier, row._count._all]));
    return {
      from,
      to,
      totals: {
        revenue: daily.reduce((sum, day) => sum + day.revenue, 0),
        bookings: daily.reduce((sum, day) => sum + day.bookings, 0),
        cancelled: daily.reduce((sum, day) => sum + day.cancelled, 0),
        activeClients: clients.length,
        averageCheck: Math.round(checks._avg.amount ?? 0),
      },
      daily,
      centers: centers.map((row) => {
        const capacity = Number(row.capacity);
        const booked = Number(row.booked);
        return {
          centerId: row.center_id,
          name: row.name,
          capacity,
          booked,
          occupancy: capacity > 0 ? booked / capacity : 0,
        };
      }),
      sports: sports.map((row) => ({
        slug: row.slug,
        name: row.name,
        bookings: Number(row.bookings),
      })),
      // Every tier is listed, even with nobody in it.
      tiers: Object.values(LoyaltyTier).map((tier) => ({
        tier,
        users: tierCounts.get(tier) ?? 0,
      })),
      bookingTypes: types.map((row) => ({ type: row.type, bookings: row._count._all })),
    };
  }
}

function fillDays(
  from: string,
  days: number,
  perDay: DayRow[],
  revenue: RevenueRow[],
): DailyStatDto[] {
  const counts = new Map(perDay.map((row) => [row.day, row]));
  const money = new Map(revenue.map((row) => [row.day, Number(row.revenue)]));
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(from, i);
    const row = counts.get(date);
    return {
      date,
      bookings: Number(row?.bookings ?? 0),
      cancelled: Number(row?.cancelled ?? 0),
      revenue: money.get(date) ?? 0,
    };
  });
}
