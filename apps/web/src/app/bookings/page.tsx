import { CalendarCheck } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ApiUnavailable } from '@/components/api-unavailable';
import { BookingCard } from '@/components/booking/booking-card';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import type { Booking } from '@/lib/api';
import { requireBooker } from '@/lib/booking-session';

export const metadata: Metadata = { title: 'Мої бронювання' };

/** Splits bookings into what is still ahead (soonest first) and the history. */
function splitByTime(bookings: Booking[]) {
  const now = Date.now();
  // An unpaid booking whose hold ran out is history even before the server releases it.
  const holdLost = (b: Booking) => !!b.payBefore && new Date(b.payBefore).getTime() <= now;
  const ahead = (b: Booking) =>
    (b.status === 'CONFIRMED' || (b.status === 'PENDING' && !holdLost(b))) &&
    new Date(b.endsAt).getTime() > now;
  // The API returns newest first; upcoming ones read better soonest first.
  return {
    upcoming: bookings.filter(ahead).reverse(),
    history: bookings.filter((b) => !ahead(b)),
  };
}

export default async function BookingsPage() {
  const { api } = await requireBooker('/bookings');
  const { data: bookings } = await api.GET('/api/bookings').catch(() => ({ data: undefined }));
  const { upcoming, history } = splitByTime(bookings ?? []);

  return (
    <>
      <PageHeader eyebrow="Особистий кабінет" title="Мої бронювання" />
      <div className="mx-auto w-full max-w-4xl space-y-10 px-4 py-8">
        {!bookings ? (
          <ApiUnavailable />
        ) : bookings.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed p-12 text-center">
            <span className="flex size-16 items-center justify-center rounded-2xl bg-accent text-ink">
              <CalendarCheck className="size-8" aria-hidden />
            </span>
            <p className="font-display text-lg font-semibold">Тут з’являться ваші бронювання</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Оберіть секцію, зал чи тренера — запис займе кілька секунд.
            </p>
            <Button asChild size="lg">
              <Link href="/catalog">До каталогу</Link>
            </Button>
          </div>
        ) : (
          <>
            <section className="space-y-4">
              <h2 className="text-2xl font-bold">Найближчі</h2>
              {upcoming.length === 0 ? (
                <p className="text-muted-foreground">
                  Найближчих занять немає.{' '}
                  <Link href="/catalog" className="font-semibold text-ink hover:underline">
                    Знайти секцію
                  </Link>
                </p>
              ) : (
                upcoming.map((booking) => <BookingCard key={booking.id} booking={booking} />)
              )}
            </section>
            {history.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-2xl font-bold">Історія</h2>
                {history.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))}
              </section>
            )}
          </>
        )}
      </div>
    </>
  );
}
