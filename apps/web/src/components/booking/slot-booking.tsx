'use client';

import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { type Availability, apiClient, apiErrorMessage, type CreateBookingBody } from '@/lib/api';
import { dateKey, formatTime, TIME_ZONE } from '@/lib/format';
import { cn } from '@/lib/utils';
import { CheckoutPanel } from './checkout-panel';

const DAYS_AHEAD = 14;
const MAX_HOURS = 4;
const DAY_MS = 24 * 60 * 60 * 1000;

const weekday = new Intl.DateTimeFormat('uk-UA', { timeZone: TIME_ZONE, weekday: 'short' });
const dayOfMonth = new Intl.DateTimeFormat('uk-UA', { timeZone: TIME_ZONE, day: 'numeric' });

type Target =
  { type: 'HALL_RENTAL'; hallId: string } | { type: 'PERSONAL_TRAINING'; trainerId: string };

type Loaded = { date: string; data?: Availability; error?: string };

interface Props {
  target: Target;
  bonusBalance: number;
}

/** Date strip, hourly grid and the live checkout for a hall or a trainer. */
export function SlotBooking({ target, bonusBalance }: Props) {
  // Lazy initialiser: the clock is read once, not on every render.
  const [days] = useState(() =>
    Array.from({ length: DAYS_AHEAD }, (_, i) => new Date(Date.now() + i * DAY_MS)),
  );
  const [date, setDate] = useState(() => dateKey(days[0]));
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [start, setStart] = useState<number | null>(null);
  const [hours, setHours] = useState(1);
  const isHall = target.type === 'HALL_RENTAL';
  const targetId = isHall ? target.hallId : target.trainerId;
  // Data for another day means the chosen day is still loading.
  const current = loaded?.date === date ? loaded : null;
  const availability = current?.data ?? null;
  const error = current?.error ?? null;

  function chooseDate(key: string) {
    setDate(key);
    setStart(null);
    setHours(1);
  }

  useEffect(() => {
    let active = true;
    const api = apiClient();
    const request = isHall
      ? api.GET('/api/halls/{id}/availability', {
          params: { path: { id: targetId }, query: { date } },
        })
      : api.GET('/api/trainers/{id}/availability', {
          params: { path: { id: targetId }, query: { date } },
        });
    request
      .then(({ data, error }) => {
        if (!active) return;
        setLoaded(
          data
            ? { date, data }
            : { date, error: apiErrorMessage(error, 'Не вдалося завантажити розклад') },
        );
      })
      .catch(() => active && setLoaded({ date, error: 'API недоступний' }));
    return () => {
      active = false;
    };
  }, [date, isHall, targetId]);

  const slots = availability?.slots ?? [];
  /** How many free hours follow the chosen start, up to the rental limit. */
  const maxHours = (() => {
    if (start === null) return 0;
    let count = 0;
    while (count < MAX_HOURS && slots[start + count]?.available) count++;
    return count;
  })();

  const request: CreateBookingBody | null =
    start === null
      ? null
      : isHall
        ? { type: 'HALL_RENTAL', hallId: targetId, startsAt: slots[start].startsAt, hours }
        : { type: 'PERSONAL_TRAINING', trainerId: targetId, startsAt: slots[start].startsAt };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <section className="space-y-3">
          <h2 className="text-lg font-bold">1. Оберіть день</h2>
          <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2">
            {days.map((day) => {
              const key = dateKey(day);
              const selected = key === date;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => chooseDate(key)}
                  aria-pressed={selected}
                  className={cn(
                    'flex w-16 shrink-0 snap-start flex-col items-center rounded-2xl border py-2 transition-[background-color,border-color,transform] duration-200 active:scale-95',
                    selected
                      ? 'border-primary bg-primary text-primary-foreground shadow-lift'
                      : 'bg-card hover:border-primary/50',
                  )}
                >
                  <span className="text-xs capitalize opacity-80">{weekday.format(day)}</span>
                  <span className="font-display text-xl font-black">{dayOfMonth.format(day)}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold">2. Оберіть час</h2>
          {error && (
            <p role="alert" className="rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </p>
          )}
          {!availability && !error && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5" aria-busy>
              {Array.from({ length: 10 }, (_, i) => (
                <Skeleton key={i} className="h-12 rounded-xl" />
              ))}
            </div>
          )}
          {availability && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {slots.map((slot, index) => {
                const inRange = start !== null && index >= start && index < start + hours;
                return (
                  <button
                    key={slot.startsAt}
                    type="button"
                    disabled={!slot.available}
                    onClick={() => {
                      setStart(index);
                      setHours(1);
                    }}
                    aria-pressed={inRange}
                    className={cn(
                      'h-12 rounded-xl border font-display font-bold tabular-nums transition-[background-color,border-color,transform] duration-200 active:scale-95',
                      inRange
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'bg-card hover:border-primary/50',
                      !slot.available &&
                        'cursor-not-allowed border-dashed bg-muted/40 text-muted-foreground line-through opacity-60 hover:border-border',
                    )}
                  >
                    {formatTime(slot.startsAt)}
                  </button>
                );
              })}
            </div>
          )}
          {availability && slots.every((slot) => !slot.available) && (
            <p className="text-sm text-muted-foreground">На цей день вільного часу немає.</p>
          )}
        </section>

        {isHall && start !== null && (
          <section className="space-y-3">
            <h2 className="text-lg font-bold">3. Тривалість</h2>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: MAX_HOURS }, (_, i) => i + 1).map((value) => (
                <button
                  key={value}
                  type="button"
                  disabled={value > maxHours}
                  onClick={() => setHours(value)}
                  aria-pressed={value === hours}
                  className={cn(
                    'rounded-full border px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                    value === hours
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'bg-card hover:border-primary/50',
                  )}
                >
                  {value} год
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <CheckoutPanel request={request} bonusBalance={bonusBalance} />
      </aside>
    </div>
  );
}
