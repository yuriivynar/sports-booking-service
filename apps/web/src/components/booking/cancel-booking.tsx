'use client';

import { Loader2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { apiErrorMessage, type Booking } from '@/lib/api';
import { browserApi } from '@/lib/api/browser';

/** Two-step cancel: the first click asks, the second one cancels. No browser dialogs. */
export function CancelBooking({
  booking,
  compact = false,
}: {
  booking: Booking;
  compact?: boolean;
}) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [pending, setPending] = useState(false);
  const refund = booking.status === 'CONFIRMED' && booking.finalPrice > 0;

  async function cancel() {
    setPending(true);
    // A network failure rejects; treat it like any other error so the buttons come back.
    const result = await browserApi()
      .then((api) =>
        api.POST('/api/bookings/{id}/cancel', { params: { path: { id: booking.id } }, body: {} }),
      )
      .catch(() => null);
    setPending(false);
    setAsking(false);
    if (!result?.data) {
      toast.error(
        result ? apiErrorMessage(result.error, 'Не вдалося скасувати') : 'API недоступний',
      );
      return;
    }
    toast.success(refund ? 'Скасовано. Гроші повернуться на картку' : 'Бронювання скасовано');
    router.refresh();
  }

  if (!asking) {
    return (
      <Button variant="outline" size={compact ? 'sm' : 'default'} onClick={() => setAsking(true)}>
        <X aria-hidden /> Скасувати
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Підтвердження">
      <span className="text-sm text-muted-foreground">
        {refund ? 'Скасувати й повернути гроші?' : 'Точно скасувати?'}
      </span>
      <Button variant="destructive" size="sm" disabled={pending} onClick={cancel}>
        {pending && <Loader2 className="animate-spin" aria-hidden />} Так
      </Button>
      <Button variant="ghost" size="sm" disabled={pending} onClick={() => setAsking(false)}>
        Ні
      </Button>
    </div>
  );
}
