'use client';

import { CreditCard, Loader2, Lock, TimerReset } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiErrorMessage, type Booking } from '@/lib/api';
import { browserApi } from '@/lib/api/browser';
import { formatPrice } from '@/lib/format';
import { celebrate } from './celebrate';

/** Cards the simulated bank understands; any future expiry and any CVC work. */
const TEST_CARDS = [
  { number: '4242 4242 4242 4242', label: 'Успішна оплата' },
  { number: '4000 0000 0000 0002', label: 'Банк відхиляє' },
  { number: '4000 0000 0000 9995', label: 'Недостатньо коштів' },
];

/** "4242424242424242" → "4242 4242 4242 4242" while the user types. */
const groupDigits = (value: string) =>
  value
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, '$1 ');

/** "1228" → "12/28" */
const formatExpiry = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};

function useSecondsLeft(deadline: string | null): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!deadline) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [deadline]);
  return deadline ? Math.max(0, Math.floor((new Date(deadline).getTime() - now) / 1000)) : null;
}

export function PaymentForm({ booking }: { booking: Booking }) {
  const router = useRouter();
  const [card, setCard] = useState('');
  const [expiry, setExpiry] = useState('');
  const [pending, setPending] = useState(false);
  const [declined, setDeclined] = useState<string | null>(null);
  const secondsLeft = useSecondsLeft(booking.payBefore);
  const expired = secondsLeft === 0;

  async function pay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const [month, year] = expiry.split('/');
    setPending(true);
    setDeclined(null);
    const { data, error, response } = await (
      await browserApi()
    ).POST('/api/bookings/{id}/pay', {
      params: { path: { id: booking.id } },
      body: {
        cardNumber: card,
        expMonth: Number(month),
        expYear: 2000 + Number(year),
        cvc: String(form.get('cvc') ?? ''),
        holder: String(form.get('holder') ?? '').trim(),
      },
    });
    setPending(false);

    if (!data) {
      const message = apiErrorMessage(error, 'Оплата не пройшла');
      // 402: the bank said no, the booking still waits; other errors end the attempt.
      if (response.status === 402) setDeclined(message);
      else {
        toast.error(message);
        router.refresh();
      }
      return;
    }
    void celebrate();
    toast.success('Оплачено! Бронювання підтверджено');
    router.refresh();
  }

  return (
    <form onSubmit={pay} className="space-y-5 rounded-3xl border bg-card p-6 shadow-lift">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <CreditCard className="size-5 text-ink" aria-hidden /> Оплата карткою
        </h2>
        {secondsLeft !== null && (
          <span
            className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground tabular-nums"
            aria-live="polite"
          >
            <TimerReset className="size-3.5" aria-hidden />
            {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
          </span>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="card">Номер картки</Label>
        <Input
          id="card"
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="0000 0000 0000 0000"
          value={card}
          onChange={(e) => setCard(groupDigits(e.target.value))}
          required
          minLength={19}
          className="font-mono tracking-wider"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="expiry">Термін дії</Label>
          <Input
            id="expiry"
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="ММ/РР"
            value={expiry}
            onChange={(e) => setExpiry(formatExpiry(e.target.value))}
            pattern="(0[1-9]|1[0-2])/\d{2}"
            title="Місяць і рік, наприклад 12/28"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cvc">CVC</Label>
          <Input
            id="cvc"
            name="cvc"
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="123"
            pattern="\d{3,4}"
            maxLength={4}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="holder">Власник картки</Label>
        <Input
          id="holder"
          name="holder"
          autoComplete="cc-name"
          placeholder="TARAS SHEVCHENKO"
          minLength={2}
          maxLength={60}
          required
          className="uppercase"
        />
      </div>

      {declined && (
        <p role="alert" className="rounded-2xl bg-destructive/10 p-3 text-sm text-destructive">
          {declined}. Спробуйте іншу картку.
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={pending || expired}>
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Lock aria-hidden />}
        {expired ? 'Час на оплату минув' : `Сплатити ${formatPrice(booking.finalPrice)}`}
      </Button>

      <details className="rounded-2xl bg-muted/60 p-3 text-sm">
        <summary className="cursor-pointer font-medium">Тестові картки (оплата імітується)</summary>
        <ul className="mt-2 space-y-1">
          {TEST_CARDS.map((test) => (
            <li key={test.number}>
              <button
                type="button"
                className="font-mono text-ink hover:underline"
                onClick={() => setCard(test.number)}
              >
                {test.number}
              </button>{' '}
              <span className="text-muted-foreground">— {test.label}</span>
            </li>
          ))}
        </ul>
      </details>
    </form>
  );
}
