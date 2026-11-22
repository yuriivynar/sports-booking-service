import { ArrowLeft, CalendarDays, Clock } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckoutPanel } from '@/components/booking/checkout-panel';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { apiErrorMessage } from '@/lib/api';
import { requireBooker } from '@/lib/booking-session';
import { formatDay, formatTimeRange, upperFirst } from '@/lib/format';
import { isUuid } from '@/lib/utils';

export const metadata: Metadata = { title: 'Запис на заняття' };

export default async function BookSessionPage({ params }: PageProps<'/book/session/[id]'>) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { api, bonusBalance } = await requireBooker(`/book/session/${id}`);
  const request = { type: 'GROUP_SESSION', groupSessionId: id } as const;
  // The quote checks every booking rule; its message explains a refusal.
  const {
    data: quote,
    error,
    response,
  } = await api.POST('/api/bookings/quote', {
    body: request,
  });
  if (response.status === 404) notFound();
  const { data: owned } = await api.GET('/api/memberships');
  const memberships = (owned ?? [])
    .filter((m) => m.status === 'ACTIVE')
    .map((m) => ({
      id: m.id,
      label:
        m.visitsLeft === null
          ? `${m.plan.name} (безліміт)`
          : `${m.plan.name} (лишилося ${m.visitsLeft})`,
    }));

  return (
    <>
      <PageHeader
        eyebrow="Групове заняття"
        title={quote?.title ?? 'Запис на заняття'}
        lead={
          quote
            ? `${upperFirst(formatDay(quote.startsAt))} · ${formatTimeRange(quote.startsAt, quote.endsAt)}`
            : undefined
        }
      />
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {quote ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-2xl border bg-card p-4">
                <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-ink">
                  <CalendarDays className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="text-sm text-muted-foreground">Дата</p>
                  <p className="font-semibold">{upperFirst(formatDay(quote.startsAt))}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border bg-card p-4">
                <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-ink">
                  <Clock className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="text-sm text-muted-foreground">Час</p>
                  <p className="font-semibold">{formatTimeRange(quote.startsAt, quote.endsAt)}</p>
                </div>
              </div>
            </div>
          ) : (
            <div
              role="alert"
              className="space-y-4 rounded-3xl border border-dashed p-8 text-center"
            >
              <p className="font-display text-lg font-semibold">
                {apiErrorMessage(error, 'Не вдалося підготувати бронювання')}
              </p>
              <Button asChild variant="outline">
                <Link href="/catalog">
                  <ArrowLeft aria-hidden /> До каталогу
                </Link>
              </Button>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Після бронювання місце утримується 15 хвилин, поки ви оплачуєте. Оплата імітується:
            гроші не списуються.
          </p>
        </div>
        {quote && (
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <CheckoutPanel
              request={request}
              bonusBalance={bonusBalance}
              memberships={memberships}
            />
          </aside>
        )}
      </div>
    </>
  );
}
