import { ArrowLeft, CalendarRange, CheckCircle2, Repeat, Ticket } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MembershipPayment } from '@/components/memberships/membership-payment';
import { Button } from '@/components/ui/button';
import { requireBooker } from '@/lib/booking-session';
import {
  formatDate,
  formatPrice,
  MEMBERSHIP_KIND_LABELS,
  MEMBERSHIP_STATUS_LABELS,
  pluralize,
} from '@/lib/format';
import { isUuid } from '@/lib/utils';

export const metadata: Metadata = { title: 'Абонемент' };

export default async function MembershipPage({ params }: PageProps<'/memberships/[id]'>) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { api } = await requireBooker(`/memberships/${id}`);
  const { data: memberships } = await api.GET('/api/memberships');
  const membership = memberships?.find((m) => m.id === id);
  if (!membership) notFound();
  const { plan } = membership;

  const facts = [
    { icon: Ticket, label: 'Тип', value: MEMBERSHIP_KIND_LABELS[membership.kind] },
    {
      icon: Repeat,
      label: 'Заняття',
      value:
        membership.visitsLeft === null
          ? 'Необмежено'
          : `Лишилося ${pluralize(membership.visitsLeft, ['заняття', 'заняття', 'занять'])}`,
    },
    {
      icon: CalendarRange,
      label: 'Термін',
      value:
        membership.startsAt && membership.endsAt
          ? `${formatDate(membership.startsAt)} — ${formatDate(membership.endsAt)}`
          : plan.durationDays
            ? `${pluralize(plan.durationDays, ['день', 'дні', 'днів'])} від оплати`
            : 'Без обмеження в часі',
    },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <Button asChild variant="ghost" size="sm" className="mb-6">
        <Link href="/memberships">
          <ArrowLeft aria-hidden /> Абонементи
        </Link>
      </Button>
      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        <article className="reveal overflow-hidden rounded-3xl border bg-card shadow-lift">
          <div className="relative space-y-2 bg-gradient-to-br from-accent/70 via-card to-card p-6 sm:p-8">
            <div
              aria-hidden
              className="stripes absolute -top-6 -right-6 h-32 w-56 text-primary/15"
            />
            <p className="text-sm font-semibold text-ink">
              {MEMBERSHIP_STATUS_LABELS[membership.status]}
            </p>
            <h1 className="text-3xl font-black sm:text-4xl">{plan.name}</h1>
            <p className="text-muted-foreground">{plan.description}</p>
            {membership.status === 'ACTIVE' && (
              <p className="flex items-center gap-2 font-medium text-success">
                <CheckCircle2 className="size-5" aria-hidden /> Обирайте його під час запису на
                заняття
              </p>
            )}
          </div>
          <dl className="grid gap-4 border-t border-dashed p-6 sm:grid-cols-3 sm:p-8">
            {facts.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3">
                <Icon className="mt-0.5 size-5 shrink-0 text-ink" aria-hidden />
                <div>
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd className="font-semibold">{value}</dd>
                </div>
              </div>
            ))}
          </dl>
          <p className="border-t px-6 py-4 font-display text-2xl font-black sm:px-8">
            {formatPrice(plan.price)}
          </p>
        </article>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          {membership.status === 'PENDING' ? (
            <MembershipPayment membership={membership} />
          ) : (
            <div className="space-y-3 rounded-3xl border bg-card p-6 text-sm text-muted-foreground">
              <p className="font-display text-lg font-semibold text-foreground">Як користуватися</p>
              <p>
                Відкрийте заняття в каталозі, натисніть «Записатися» й оберіть абонемент — ціна
                стане 0 грн.
              </p>
              <Button asChild className="w-full">
                <Link href="/catalog">До каталогу</Link>
              </Button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
