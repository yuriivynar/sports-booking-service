import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SlotBooking } from '@/components/booking/slot-booking';
import { PageHeader } from '@/components/layout/page-header';
import { requireBooker } from '@/lib/booking-session';
import { formatPrice } from '@/lib/format';
import { isUuid } from '@/lib/utils';

export const metadata: Metadata = { title: 'Персональне тренування' };

export default async function BookTrainerPage({ params }: PageProps<'/book/trainer/[id]'>) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { api, bonusBalance } = await requireBooker(`/book/trainer/${id}`);
  const { data: trainer, response } = await api.GET('/api/trainers/{id}', {
    params: { path: { id } },
  });
  if (response.status === 404 || !trainer) notFound();

  return (
    <>
      <PageHeader
        eyebrow="Персональне тренування"
        title={trainer.fullName}
        lead={`${trainer.sports.map((s) => s.name).join(', ')} · ${trainer.center.name} · ${formatPrice(trainer.sessionPrice)} за годину`}
      />
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <SlotBooking
          target={{ type: 'PERSONAL_TRAINING', trainerId: trainer.id }}
          bonusBalance={bonusBalance}
        />
      </div>
    </>
  );
}
