import type { Metadata } from 'next';
import Link from 'next/link';
import { ApiUnavailable } from '@/components/api-unavailable';
import {
  BarList,
  ChartCard,
  DailyColumns,
  formatLongDay,
  MeterList,
  RevenueArea,
  SegmentedBar,
  StatTile,
} from '@/components/admin/charts';
import { MaintenanceButton } from '@/components/admin/maintenance-button';
import { requireAdmin } from '@/lib/admin-session';
import { BOOKING_TYPE_LABELS, formatPrice, TIER_LABELS } from '@/lib/format';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Огляд' };

const PERIODS = [7, 30, 90] as const;

export default async function AdminOverviewPage({ searchParams }: PageProps<'/admin'>) {
  const raw = (await searchParams).days;
  const days = PERIODS.find((p) => String(p) === raw) ?? 30;
  const api = await requireAdmin('/admin');
  const { data: stats } = await api
    .GET('/api/admin/stats', { params: { query: { days } } })
    .catch(() => ({ data: undefined }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-extrabold">Огляд</h1>
        <nav aria-label="Період" className="flex gap-1 rounded-full border p-1">
          {PERIODS.map((period) => (
            <Link
              key={period}
              href={`/admin?days=${period}`}
              aria-current={period === days ? 'true' : undefined}
              className={cn(
                'rounded-full px-3 py-1 text-sm',
                period === days
                  ? 'bg-primary font-semibold text-primary-foreground'
                  : 'hover:bg-accent',
              )}
            >
              {period} днів
            </Link>
          ))}
        </nav>
      </div>

      {!stats ? (
        <ApiUnavailable />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {formatLongDay(stats.from)} — {formatLongDay(stats.to)}
          </p>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatTile
              label="Виторг"
              value={formatPrice(stats.totals.revenue)}
              hint="Без повернених оплат"
            />
            <StatTile label="Бронювання" value={String(stats.totals.bookings)} />
            <StatTile label="Скасовано" value={String(stats.totals.cancelled)} />
            <StatTile label="Активні клієнти" value={String(stats.totals.activeClients)} />
            <StatTile label="Середній чек" value={formatPrice(stats.totals.averageCheck)} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title="Бронювання по днях"
              subtitle="За датою створення"
              table={{
                columns: ['День', 'Бронювання', 'Скасовані'],
                rows: stats.daily.map((d) => [formatLongDay(d.date), d.bookings, d.cancelled]),
              }}
            >
              <DailyColumns data={stats.daily} />
            </ChartCard>
            <ChartCard
              title="Виторг по днях, грн"
              subtitle="Успішні оплати бронювань і абонементів"
              table={{
                columns: ['День', 'Виторг'],
                rows: stats.daily.map((d) => [formatLongDay(d.date), formatPrice(d.revenue)]),
              }}
            >
              <RevenueArea data={stats.daily} />
            </ChartCard>
            <ChartCard
              title="Заповненість групових занять"
              subtitle="Заняття періоду й найближчих 14 днів"
              table={{
                columns: ['Центр', 'Зайнято', 'Місць', 'Заповненість'],
                rows: stats.centers.map((c) => [
                  c.name,
                  c.booked,
                  c.capacity,
                  `${Math.round(c.occupancy * 100)}%`,
                ]),
              }}
            >
              <MeterList
                items={stats.centers.map((c) => ({
                  label: c.name,
                  share: c.occupancy,
                  detail: `${c.booked} з ${c.capacity}`,
                }))}
              />
            </ChartCard>
            <ChartCard
              title="Популярні види спорту"
              subtitle="Записи на групові заняття за період"
              table={{
                columns: ['Вид спорту', 'Записів'],
                rows: stats.sports.map((s) => [s.name, s.bookings]),
              }}
            >
              <BarList items={stats.sports.map((s) => ({ label: s.name, value: s.bookings }))} />
            </ChartCard>
            <ChartCard
              title="Клієнти за рівнем лояльності"
              subtitle="Зараз"
              table={{
                columns: ['Рівень', 'Клієнтів'],
                rows: stats.tiers.map((t) => [TIER_LABELS[t.tier], t.users]),
              }}
            >
              <SegmentedBar
                parts={stats.tiers.map((t) => ({ label: TIER_LABELS[t.tier], value: t.users }))}
              />
            </ChartCard>
            <ChartCard
              title="Бронювання за типом"
              subtitle="Оплачені й завершені за період"
              table={{
                columns: ['Тип', 'Бронювань'],
                rows: stats.bookingTypes.map((t) => [BOOKING_TYPE_LABELS[t.type], t.bookings]),
              }}
            >
              <BarList
                items={[...stats.bookingTypes]
                  .sort((a, b) => b.bookings - a.bookings)
                  .map((t) => ({ label: BOOKING_TYPE_LABELS[t.type], value: t.bookings }))}
              />
            </ChartCard>
          </div>
        </>
      )}

      <MaintenanceButton />
    </div>
  );
}
