'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { apiErrorMessage, type Booking } from '@/lib/api';
import { browserApi } from '@/lib/api/browser';
import { type CardBody, CardPaymentForm, type PayOutcome } from './card-payment-form';
import { celebrate } from './celebrate';

/** Answers of the simulated bank, for the style guide where nothing is sent. */
const DEMO_DECLINES: Record<string, string> = {
  '4000000000000002': 'Банк відхилив платіж',
  '4000000000009995': 'Недостатньо коштів на картці',
};

/**
 * Pays for a pending booking within its hold. With `demo` (the /design
 * page) it answers like the simulated bank without calling the API.
 */
export function PaymentForm({ booking, demo = false }: { booking: Booking; demo?: boolean }) {
  const router = useRouter();
  // When the hold runs out, reload: the server releases it and the page
  // shows the real status instead of a dead form.
  const onExpired = useCallback(() => router.refresh(), [router]);

  async function pay(card: CardBody): Promise<PayOutcome> {
    if (demo) {
      const declined = DEMO_DECLINES[card.cardNumber.replace(/\D/g, '')];
      if (declined) return { kind: 'declined', message: declined };
      void celebrate();
      toast.success('Демо: оплату не надіслано, на сторінці бронювання вона справжня');
      return { kind: 'paid' };
    }
    const result = await browserApi()
      .then((api) =>
        api.POST('/api/bookings/{id}/pay', { params: { path: { id: booking.id } }, body: card }),
      )
      .catch(() => null);
    if (!result) {
      toast.error('API недоступний. Спробуйте ще раз');
      return { kind: 'failed', message: 'API недоступний' };
    }
    if (!result.data) {
      const message = apiErrorMessage(result.error, 'Оплата не пройшла');
      // 402: the bank said no, the booking still waits; other errors end the attempt.
      if (result.response.status === 402) return { kind: 'declined', message };
      toast.error(message);
      router.refresh();
      return { kind: 'failed', message };
    }
    void celebrate();
    toast.success('Оплачено! Бронювання підтверджено');
    router.refresh();
    return { kind: 'paid' };
  }

  return (
    <CardPaymentForm
      amount={booking.finalPrice}
      deadline={booking.payBefore}
      onExpired={onExpired}
      pay={pay}
    />
  );
}
