'use client';

import { CreditCard, Loader2, Lock, TimerReset } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Schemas } from '@/lib/api';
import { formatPrice } from '@/lib/format';

export type CardBody = Schemas['CardPaymentDto'];

/** Result of one payment attempt, as the caller reports it back to the form. */
export type PayOutcome =
  { kind: 'paid' } | { kind: 'declined'; message: string } | { kind: 'failed'; message: string };

/** Cards the simulated bank understands; any future expiry and any 3- or 4-digit CVC work. */
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

function useSecondsLeft(deadline: string | null | undefined): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!deadline) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [deadline]);
  return deadline ? Math.max(0, Math.floor((new Date(deadline).getTime() - now) / 1000)) : null;
}

interface Props {
  /** Amount in kopecks. */
  amount: number;
  /** Sends the card; the form shows a decline inline and stays open. */
  pay: (card: CardBody) => Promise<PayOutcome>;
  /** When the place stops being held; shows a countdown. */
  deadline?: string | null;
  onExpired?: () => void;
}

/** Simulated card form, shared by bookings and memberships. */
export function CardPaymentForm({ amount, pay, deadline, onExpired }: Props) {
  const [card, setCard] = useState('');
  const [expiry, setExpiry] = useState('');
  const [pending, setPending] = useState(false);
  const [declined, setDeclined] = useState<string | null>(null);
  const secondsLeft = useSecondsLeft(deadline);
  const expired = secondsLeft === 0;

  useEffect(() => {
    if (expired) onExpired?.();
  }, [expired, onExpired]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const [month, year] = expiry.split('/');
    setPending(true);
    setDeclined(null);
    const outcome = await pay({
      cardNumber: card,
      expMonth: Number(month),
      expYear: 2000 + Number(year),
      cvc: String(form.get('cvc') ?? ''),
      holder: String(form.get('holder') ?? '').trim(),
    });
    setPending(false);
    if (outcome.kind === 'declined') setDeclined(outcome.message);
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-3xl border bg-card p-6 shadow-lift">
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
        {expired ? 'Час на оплату минув' : `Сплатити ${formatPrice(amount)}`}
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
