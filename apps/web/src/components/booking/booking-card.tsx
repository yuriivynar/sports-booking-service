import {
  CalendarDays,
  ChevronRight,
  Clock,
  MapPin,
  UserRound,
  Users,
  Warehouse,
} from 'lucide-react';
import Link from 'next/link';
import { SportIcon } from '@/components/sport-icon';
import type { Booking } from '@/lib/api';
import {
  BOOKING_TYPE_LABELS,
  formatDay,
  formatPrice,
  formatTimeRange,
  upperFirst,
} from '@/lib/format';
import { cn } from '@/lib/utils';
import { BookingStatusBadge } from './booking-status-badge';
import { CancelBooking } from './cancel-booking';

const TYPE_ICONS = { GROUP_SESSION: Users, HALL_RENTAL: Warehouse, PERSONAL_TRAINING: UserRound };

/** One booking in the list, styled as a ticket with a perforated edge. */
export function BookingCard({ booking }: { booking: Booking }) {
  const TypeIcon = TYPE_ICONS[booking.type];
  const inactive = booking.status === 'CANCELLED' || booking.status === 'COMPLETED';
  return (
    <article
      className={cn(
        'card-lift reveal relative grid overflow-hidden rounded-3xl border bg-card sm:grid-cols-[1fr_auto]',
        inactive && 'opacity-70',
      )}
    >
      <Link
        href={`/bookings/${booking.id}`}
        className="flex gap-4 p-5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-ink">
          {booking.sport ? (
            <SportIcon name={booking.sport.icon} className="size-6" />
          ) : (
            <TypeIcon className="size-6" aria-hidden />
          )}
        </span>
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <BookingStatusBadge status={booking.status} />
            <span className="text-xs text-muted-foreground">
              {BOOKING_TYPE_LABELS[booking.type]}
            </span>
          </div>
          <h3 className="truncate text-lg font-bold">{booking.title}</h3>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-4" aria-hidden />{' '}
              {upperFirst(formatDay(booking.startsAt))}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="size-4" aria-hidden />
              {formatTimeRange(booking.startsAt, booking.endsAt)}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4" aria-hidden /> {booking.center.name}
            </span>
          </p>
        </div>
      </Link>
      <div className="flex items-center justify-between gap-3 border-t border-dashed p-5 sm:flex-col sm:items-end sm:justify-center sm:border-t-0 sm:border-l">
        <span className="font-display text-xl font-black tabular-nums">
          {booking.finalPrice === 0 ? 'Безкоштовно' : formatPrice(booking.finalPrice)}
        </span>
        <div className="flex items-center gap-2">
          {booking.allowedActions.includes('pay') && (
            <Link
              href={`/bookings/${booking.id}`}
              className="flex items-center text-sm font-semibold text-ink hover:underline"
            >
              Оплатити <ChevronRight className="size-4" aria-hidden />
            </Link>
          )}
          {booking.allowedActions.includes('cancel') && <CancelBooking booking={booking} compact />}
        </div>
      </div>
    </article>
  );
}
