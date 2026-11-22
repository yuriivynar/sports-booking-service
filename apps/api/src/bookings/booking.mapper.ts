import type { Prisma } from '../generated/prisma/client.js';
import type { BookingDto, PriceLineDto } from './dto/booking.dto.js';
import { BookingLifecycle } from './state/booking-state.js';

/**
 * Bookings in a session the center called off: they never complete, earn
 * points or get reminders, even if their own cancellation has not finished.
 */
export const NOT_IN_CANCELLED_SESSION = {
  NOT: { groupSession: { is: { isCancelled: true } } },
} satisfies Prisma.BookingWhereInput;

/** An unpaid booking holds its place for this long. */
export const HOLD_MS = 15 * 60 * 1000;

const CENTER_REF = { select: { slug: true, name: true, address: true } } as const;
const SPORT_REF = { select: { slug: true, name: true, icon: true, photoUrl: true } } as const;

export const BOOKING_INCLUDE = {
  hall: { select: { name: true, center: CENTER_REF } },
  trainer: { select: { fullName: true, center: CENTER_REF } },
  groupSession: {
    select: {
      hall: { select: { name: true } },
      trainer: { select: { fullName: true } },
      section: { select: { name: true, sport: SPORT_REF, center: CENTER_REF } },
    },
  },
} as const satisfies Prisma.BookingInclude;

export type BookingRow = Prisma.BookingGetPayload<{ include: typeof BOOKING_INCLUDE }>;

export function bookingTitle(row: BookingRow): string {
  if (row.groupSession) return row.groupSession.section.name;
  if (row.type === 'HALL_RENTAL' && row.hall) return `Оренда: ${row.hall.name}`;
  return `Персональне тренування: ${row.trainer?.fullName ?? ''}`.trim();
}

export function holdExpired(row: { status: string; createdAt: Date }, now: Date): boolean {
  return row.status === 'PENDING' && row.createdAt.getTime() + HOLD_MS <= now.getTime();
}

export function toBookingDto(row: BookingRow, now: Date = new Date()): BookingDto {
  const session = row.groupSession;
  const center = session?.section.center ?? row.hall?.center ?? row.trainer!.center;
  const lifecycle = new BookingLifecycle(row.status, row, now);
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    title: bookingTitle(row),
    hallName: session?.hall.name ?? row.hall?.name ?? null,
    trainerName: session?.trainer?.fullName ?? row.trainer?.fullName ?? null,
    sport: session?.section.sport ?? null,
    center,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    basePrice: row.basePrice,
    discount: row.discount,
    pointsRedeemed: row.pointsRedeemed,
    finalPrice: row.finalPrice,
    pointsEarned: row.pointsEarned,
    priceBreakdown: (row.priceBreakdown ?? []) as unknown as PriceLineDto[],
    payBefore: row.status === 'PENDING' ? new Date(row.createdAt.getTime() + HOLD_MS) : null,
    cancelReason: row.cancelReason,
    createdAt: row.createdAt,
    // An expired hold can no longer be paid, even before the cleanup releases it.
    allowedActions: holdExpired(row, now)
      ? lifecycle.allowedActions().filter((action) => action !== 'pay')
      : lifecycle.allowedActions(),
  };
}
