'use client';

import { CalendarCheck, Coins, Loader2, Ticket } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { apiErrorMessage, type BookingQuote, type CreateBookingBody } from '@/lib/api';
import { browserApi } from '@/lib/api/browser';
import { pluralize } from '@/lib/format';
import { PriceBreakdown } from './price-breakdown';

interface Props {
  /** What to book; null until the user picks a slot. */
  request: CreateBookingBody | null;
  bonusBalance: number;
  /** Active memberships the user can pay with (group sessions only). */
  memberships?: { id: string; label: string }[];
}

const NO_MEMBERSHIP = 'none';

type QuoteResult =
  | { key: string; kind: 'ready'; quote: BookingQuote }
  | { key: string; kind: 'error'; message: string };

/**
 * Live price for the chosen slot. The server prices every change, so the
 * page never shows a number the booking would not get.
 */
export function CheckoutPanel({ request, bonusBalance, memberships = [] }: Props) {
  const router = useRouter();
  const [usePoints, setUsePoints] = useState(false);
  const [membershipId, setMembershipId] = useState(NO_MEMBERSHIP);
  const [result, setResult] = useState<QuoteResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const body: CreateBookingBody | null = request && {
    ...request,
    pointsToRedeem: usePoints ? bonusBalance : 0,
    ...(membershipId !== NO_MEMBERSHIP && { membershipId }),
  };
  const key = JSON.stringify(body);
  // Derived, not stored: a result for another request means a new one is on its way.
  const state = !body
    ? ({ kind: 'idle' } as const)
    : result?.key === key
      ? result
      : ({ kind: 'loading' } as const);

  useEffect(() => {
    if (!body) return;
    let current = true;
    void browserApi()
      .then((api) => api.POST('/api/bookings/quote', { body }))
      .then(({ data, error }) => {
        if (!current) return;
        setResult(
          data
            ? { key, kind: 'ready', quote: data }
            : {
                key,
                kind: 'error',
                message: apiErrorMessage(error, 'Не вдалося розрахувати ціну'),
              },
        );
      })
      .catch(() => current && setResult({ key, kind: 'error', message: 'API недоступний' }));
    return () => {
      current = false;
    };
    // `key` captures every field of `body`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  async function book() {
    if (!body) return;
    setSubmitting(true);
    const result = await browserApi()
      .then((api) => api.POST('/api/bookings', { body }))
      .catch(() => null);
    const data = result?.data;
    if (!data) {
      setSubmitting(false);
      toast.error(
        result ? apiErrorMessage(result.error, 'Не вдалося забронювати') : 'API недоступний',
      );
      return;
    }
    // Free bookings are confirmed at once; others go to the payment form.
    router.push(
      data.status === 'CONFIRMED' ? `/bookings/${data.id}?celebrate=1` : `/bookings/${data.id}`,
    );
  }

  return (
    <div className="space-y-5 rounded-3xl border bg-card p-6 shadow-lift">
      <h2 className="text-xl font-bold">Ваше бронювання</h2>

      {state.kind === 'idle' && (
        <p className="text-sm text-muted-foreground">Оберіть час, і тут з’явиться ціна.</p>
      )}
      {state.kind === 'loading' && (
        <div className="space-y-3" aria-busy>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-9 w-full" />
        </div>
      )}
      {state.kind === 'error' && (
        <p role="alert" className="rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">
          {state.message}
        </p>
      )}
      {state.kind === 'ready' && (
        <PriceBreakdown
          lines={state.quote.priceBreakdown}
          finalPrice={state.quote.finalPrice}
          pointsEarned={state.quote.pointsEarned}
        />
      )}

      {memberships.length > 0 && (
        <div className="space-y-2 rounded-2xl bg-muted/60 p-3">
          <Label htmlFor="membership" className="flex items-center gap-2 text-sm font-normal">
            <Ticket className="size-4 text-ink" aria-hidden /> Оплатити абонементом
          </Label>
          <Select value={membershipId} onValueChange={setMembershipId}>
            <SelectTrigger id="membership" className="w-full bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_MEMBERSHIP}>Без абонемента</SelectItem>
              {memberships.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {bonusBalance > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-muted/60 p-3">
          <Label htmlFor="use-points" className="flex items-center gap-2 text-sm font-normal">
            <Coins className="size-4 text-ink" aria-hidden />
            Використати бали (є {pluralize(bonusBalance, ['бал', 'бали', 'балів'])})
          </Label>
          <Switch id="use-points" checked={usePoints} onCheckedChange={setUsePoints} />
        </div>
      )}

      <Button
        size="lg"
        className="w-full"
        disabled={state.kind !== 'ready' || submitting}
        onClick={book}
      >
        {submitting ? (
          <Loader2 className="animate-spin" aria-hidden />
        ) : (
          <CalendarCheck aria-hidden />
        )}
        {state.kind === 'ready' && state.quote.finalPrice === 0
          ? 'Забронювати безкоштовно'
          : 'Забронювати й перейти до оплати'}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Місце утримується 15 хвилин до оплати. Скасувати можна за 2 години до початку.
      </p>
    </div>
  );
}
