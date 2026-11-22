'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  type CardBody,
  CardPaymentForm,
  type PayOutcome,
} from '@/components/booking/card-payment-form';
import { celebrate } from '@/components/booking/celebrate';
import { apiErrorMessage, type Membership } from '@/lib/api';
import { browserApi } from '@/lib/api/browser';

export function MembershipPayment({ membership }: { membership: Membership }) {
  const router = useRouter();

  async function pay(card: CardBody): Promise<PayOutcome> {
    const result = await browserApi()
      .then((api) =>
        api.POST('/api/memberships/{id}/pay', {
          params: { path: { id: membership.id } },
          body: card,
        }),
      )
      .catch(() => null);
    if (!result) {
      toast.error('API недоступний. Спробуйте ще раз');
      return { kind: 'failed', message: 'API недоступний' };
    }
    if (!result.data) {
      const message = apiErrorMessage(result.error, 'Оплата не пройшла');
      if (result.response.status === 402) return { kind: 'declined', message };
      toast.error(message);
      router.refresh();
      return { kind: 'failed', message };
    }
    void celebrate();
    toast.success('Абонемент активовано');
    router.refresh();
    return { kind: 'paid' };
  }

  return <CardPaymentForm amount={membership.plan.price} pay={pay} />;
}
