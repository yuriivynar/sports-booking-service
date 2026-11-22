'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { apiErrorMessage, type Booking } from '@/lib/api';
import { browserApi } from '@/lib/api/browser';
import { type CardBody, CardPaymentForm, type PayOutcome } from './card-payment-form';
import { celebrate } from './celebrate';

/** Pays for a pending booking within its hold. */
export function PaymentForm({ booking }: { booking: Booking }) {
  const router = useRouter();
  // When the hold runs out, reload: the server releases it and the page
  // shows the real status instead of a dead form.
  const onExpired = useCallback(() => router.refresh(), [router]);

  async function pay(card: CardBody): Promise<PayOutcome> {
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
