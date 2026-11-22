import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  MapPin,
  UserRound,
  Warehouse,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BookingStatusBadge } from '@/components/booking/booking-status-badge';
import { CancelBooking } from '@/components/booking/cancel-booking';
import { CelebrateOnMount } from '@/components/booking/celebrate-on-mount';
import { PaymentForm } from '@/components/booking/payment-form';
import { PriceBreakdown } from '@/components/booking/price-breakdown';
import { Button } from '@/components/ui/button';
import { requireBooker } from '@/lib/booking-session';
import { BOOKING_TYPE_LABELS, formatDay, formatTimeRange, upperFirst } from '@/lib/format';
import { isUuid } from '@/lib/utils';

export const metadata: Metadata = { title: 'Бронювання' };

export default async function BookingPage({ params, searchParams }: PageProps<'/bookings/[id]'>) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { api } = await requireBooker(`/bookings/${id}`);
  const { data: booking } = await api.GET('/api/bookings/{id}', { params: { path: { id } } });
  if (!booking) notFound();
  const celebrate = (await searchParams).celebrate === '1' && booking.status === 'CONFIRMED';
  const canPay = booking.allowedActions.includes('pay');

  const facts = [
    { icon: CalendarDays, label: 'Дата', value: upperFirst(formatDay(booking.startsAt)) },
    { icon: Clock, label: 'Час', value: formatTimeRange(booking.startsAt, booking.endsAt) },
    { icon: MapPin, label: 'Центр', value: `${booking.center.name}, ${booking.center.address}` },
    booking.hallName && { icon: Warehouse, label: 'Зал', value: booking.hallName },
    booking.trainerName && { icon: UserRound, label: 'Тренер', value: booking.trainerName },
  ].filter((fact) => !!fact);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      {celebrate && <CelebrateOnMount />}
      <Button asChild variant="ghost" size="sm" className="mb-6">
        <Link href="/bookings">
          <ArrowLeft aria-hidden /> Мої бронювання
        </Link>
      </Button>

      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        <article className="reveal overflow-hidden rounded-3xl border bg-card shadow-lift">
          <div className="relative space-y-3 bg-gradient-to-br from-accent/70 via-card to-card p-6 sm:p-8">
            <div
              aria-hidden
              className="stripes absolute -top-6 -right-6 h-32 w-56 text-primary/15"
            />
            <div className="flex flex-wrap items-center gap-2">
              <BookingStatusBadge status={booking.status} />
              <span className="text-sm text-muted-foreground">
                {BOOKING_TYPE_LABELS[booking.type]}
              </span>
            </div>
            <h1 className="text-3xl font-black sm:text-4xl">{booking.title}</h1>
            {booking.status === 'CONFIRMED' && (
              <p className="flex items-center gap-2 font-medium text-success">
                <CheckCircle2 className="size-5" aria-hidden /> Чекаємо на вас!
              </p>
            )}
            {booking.cancelReason && (
              <p className="text-sm text-muted-foreground">
                Причина скасування: {booking.cancelReason}
              </p>
            )}
          </div>
          <dl className="grid gap-4 border-t border-dashed p-6 sm:grid-cols-2 sm:p-8">
            {facts.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3">
                <Icon className="mt-0.5 size-5 shrink-0 text-ink" aria-hidden />
                <div>
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd className="font-semibold">{value}</dd>
                </div>
              </div>
            ))}
          </dl>
          <div className="border-t border-dashed p-6 sm:p-8">
            <PriceBreakdown
              lines={booking.priceBreakdown}
              finalPrice={booking.finalPrice}
              pointsEarned={booking.status === 'PENDING' ? 0 : booking.pointsEarned}
            />
          </div>
          {booking.allowedActions.includes('cancel') && (
            <div className="border-t p-6 sm:px-8">
              <CancelBooking booking={booking} />
            </div>
          )}
        </article>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          {canPay ? (
            <PaymentForm booking={booking} />
          ) : (
            <div className="space-y-3 rounded-3xl border bg-card p-6 text-sm text-muted-foreground">
              <p className="font-display text-lg font-semibold text-foreground">Що далі?</p>
              <p>За 24 і за 2 години до початку ми нагадаємо про заняття.</p>
              <p>Скасувати підтверджене бронювання можна не пізніше ніж за 2 години до початку.</p>
              <Button asChild variant="outline" className="w-full">
                <Link href="/catalog">Забронювати ще</Link>
              </Button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
