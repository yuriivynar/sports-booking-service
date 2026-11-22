import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SlotBooking } from '@/components/booking/slot-booking';
import { PageHeader } from '@/components/layout/page-header';
import { requireBooker } from '@/lib/booking-session';
import { formatPrice, HALL_KIND_LABELS } from '@/lib/format';
import { isUuid } from '@/lib/utils';

export const metadata: Metadata = { title: 'Оренда залу' };

export default async function BookHallPage({ params }: PageProps<'/book/hall/[id]'>) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { api, bonusBalance } = await requireBooker(`/book/hall/${id}`);
  const { data: halls } = await api.GET('/api/halls');
  const hall = halls?.find((item) => item.id === id);
  if (!hall) notFound();

  return (
    <>
      <PageHeader
        eyebrow={`Оренда · ${HALL_KIND_LABELS[hall.kind]}`}
        title={hall.name}
        lead={`${hall.center.name}, ${hall.center.address} · ${formatPrice(hall.hourlyPrice)} за годину`}
      />
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <SlotBooking
          target={{ type: 'HALL_RENTAL', hallId: hall.id }}
          bonusBalance={bonusBalance}
        />
      </div>
    </>
  );
}
