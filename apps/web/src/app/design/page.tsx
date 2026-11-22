import { ArrowRight, Heart } from 'lucide-react';
import type { Metadata } from 'next';
import {
  BarList,
  ChartCard,
  DailyColumns,
  MeterList,
  RevenueArea,
  SegmentedBar,
  StatTile,
} from '@/components/admin/charts';
import { MaintenanceButton } from '@/components/admin/maintenance-button';
import { BookingCard } from '@/components/booking/booking-card';
import { BookingStatusBadge } from '@/components/booking/booking-status-badge';
import { PaymentForm } from '@/components/booking/payment-form';
import { PriceBreakdown } from '@/components/booking/price-breakdown';
import { Logo, LogoMark } from '@/components/brand/logo';
import { SeatsMeter } from '@/components/catalog/seats-meter';
import { PageHeader } from '@/components/layout/page-header';
import { CountUp } from '@/components/motion/count-up';
import { Button } from '@/components/ui/button';
import type { Booking } from '@/lib/api';

export const metadata: Metadata = { title: 'Дизайн-система' };

/** Demo booking for the style guide; the dates are fixed, nothing is sent anywhere. */
const DEMO_BOOKING: Booking = {
  id: '00000000-0000-4000-8000-000000000000',
  type: 'GROUP_SESSION',
  status: 'CONFIRMED',
  title: 'Йога для початківців',
  hallName: 'Зала йоги',
  trainerName: 'Олена Коваль',
  sport: { slug: 'yoga', name: 'Йога', icon: 'flower-2', photoUrl: null },
  center: { slug: 'sporthub-tsentr', name: 'SportHub Центр', address: 'просп. Свободи, 22' },
  startsAt: '2026-11-27T16:00:00.000Z',
  endsAt: '2026-11-27T17:00:00.000Z',
  basePrice: 25_000,
  discount: 7_000,
  pointsRedeemed: 20,
  finalPrice: 16_000,
  pointsEarned: 4,
  priceBreakdown: [
    { kind: 'BASE', label: 'Базова ціна', amount: 25_000 },
    { kind: 'PROMOTION', label: 'Акція «Тиждень йоги: −20%»', amount: -5_000 },
    { kind: 'LOYALTY', label: 'Картка «Преміум» −10%', amount: -2_000 },
    { kind: 'BONUS_POINTS', label: 'Бонусні бали: 20', amount: -2_000 },
  ],
  payBefore: null,
  cancelReason: null,
  createdAt: '2026-11-23T08:00:00.000Z',
  allowedActions: [],
};

/** Thirty demo days with a weekly rhythm; fixed, so the page renders the same every time. */
const DEMO_DAYS = Array.from({ length: 30 }, (_, i) => {
  const date = new Date(Date.UTC(2026, 9, 24 + i)).toISOString().slice(0, 10);
  const weekend = [5, 6].includes(i % 7);
  const bookings = (weekend ? 14 : 8) + ((i * 7) % 5) + Math.floor(i / 6);
  return {
    date,
    bookings,
    cancelled: i % 4 === 0 ? 2 : i % 3 === 0 ? 1 : 0,
    revenue: bookings * 23_500,
  };
});

const COLORS = [
  {
    token: 'primary',
    role: 'Кнопки, акценти, маркери карти',
    swatch: 'bg-primary',
    note: 'Текст на ньому — primary-foreground, контраст ≈ 7:1',
  },
  {
    token: 'ink',
    role: 'Помаранчевий текст і іконки',
    swatch: 'bg-ink',
    note: '5.2:1 на світлому фоні',
  },
  {
    token: 'electric',
    role: 'Другорядний акцент',
    swatch: 'bg-electric',
    note: 'Графіки, корпоративна картка',
  },
  { token: 'success', role: 'Вільні місця, успіх', swatch: 'bg-success', note: '' },
  { token: 'destructive', role: 'Помилки, немає місць', swatch: 'bg-destructive', note: '' },
  { token: 'foreground', role: 'Основний текст', swatch: 'bg-foreground', note: '' },
  {
    token: 'muted',
    role: 'Фони блоків',
    swatch: 'bg-muted',
    note: 'muted-foreground — другорядний текст',
  },
  { token: 'accent', role: 'Чипи, підсвітка', swatch: 'bg-accent', note: '' },
];

const TYPE = [
  {
    label: 'Display · Unbounded 900',
    className: 'font-display text-5xl font-black',
    sample: 'Спорт у Львові',
  },
  {
    label: 'H2 · Unbounded 800',
    className: 'font-display text-3xl font-extrabold',
    sample: 'Види спорту',
  },
  {
    label: 'H3 · Unbounded 700',
    className: 'font-display text-lg font-bold',
    sample: 'Йога для початківців',
  },
  {
    label: 'Body · Geist 400',
    className: 'text-base',
    sample: 'Бронюйте зал на годину або записуйтеся на групове заняття.',
  },
  {
    label: 'Small · Geist 400',
    className: 'text-sm text-muted-foreground',
    sample: 'Вільно 6 місць з 15',
  },
];

const PRINCIPLES = [
  ['Контраст WCAG AA', 'Текст ≥ 4.5:1, великі елементи ≥ 3:1. На помаранчевому — темний текст.'],
  [
    'Клавіатура',
    'Видимий фокус :focus-visible, посилання «Перейти до вмісту», логічний порядок Tab.',
  ],
  ['Менше руху', 'Усі анімації вимикаються, якщо в системі ввімкнено «Зменшити рух».'],
  [
    'Продуктивність',
    'Анімуються лише transform і opacity; ефекти прокрутки — на CSS без JavaScript.',
  ],
  ['Дотики', 'Кнопки й пункти нижньої панелі ≥ 44 px, головні дії в зоні великого пальця.'],
  ['Стани', 'Скелетони під час завантаження, порожні стани з підказкою, toast-повідомлення.'],
];

export default function DesignSystemPage() {
  return (
    <>
      <PageHeader
        eyebrow="Документація"
        title="Дизайн-система SportHub"
        lead="Токени, типографіка та компоненти, з яких зібраний інтерфейс. Кольори задано ролями, тож світла й темна теми змінюють лише значення токенів."
      />
      <div className="mx-auto w-full max-w-6xl space-y-16 px-4 py-10">
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Логотип</h2>
          <div className="flex flex-wrap items-center gap-8 rounded-3xl border bg-card p-8">
            <Logo />
            <LogoMark className="size-16" />
            <p className="max-w-md text-sm text-muted-foreground">
              Літера «S» з нахилом уперед — рух і швидкість. Той самий знак у favicon, іконці для
              iOS та прев’ю для соцмереж.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Кольори</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {COLORS.map((color) => (
              <div key={color.token} className="overflow-hidden rounded-2xl border bg-card">
                <div className={`h-20 ${color.swatch}`} />
                <div className="space-y-1 p-4 text-sm">
                  <p className="font-mono font-semibold">--{color.token}</p>
                  <p>{color.role}</p>
                  {color.note && <p className="text-xs text-muted-foreground">{color.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Типографіка</h2>
          <div className="divide-y rounded-3xl border bg-card">
            {TYPE.map((row) => (
              <div
                key={row.label}
                className="grid gap-2 p-5 sm:grid-cols-[200px_1fr] sm:items-center"
              >
                <p className="font-mono text-xs text-muted-foreground">{row.label}</p>
                <p className={row.className}>{row.sample}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Кнопки</h2>
          <div className="flex flex-wrap items-center gap-3 rounded-3xl border bg-card p-8">
            <Button size="lg">
              Основна дія <ArrowRight />
            </Button>
            <Button size="lg" variant="outline">
              Другорядна
            </Button>
            <Button size="lg" variant="secondary">
              Нейтральна
            </Button>
            <Button size="lg" variant="ghost">
              Прозора
            </Button>
            <Button size="lg" variant="destructive">
              Скасувати
            </Button>
            <Button size="icon-lg" variant="outline" aria-label="Додати в улюблені">
              <Heart />
            </Button>
            <Button size="lg" disabled>
              Недоступна
            </Button>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Рух</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="card-lift rounded-3xl border bg-card p-6">
              <p className="font-semibold">Підйом картки</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Наведіть курсор: зсув і тінь за 300 мс, крива ease-out-expo.
              </p>
            </div>
            <div className="rounded-3xl border bg-card p-6">
              <p className="font-semibold">Лічильник</p>
              <p className="font-display text-4xl font-black text-ink">
                <CountUp value={1250} />
              </p>
              <p className="mt-2 text-sm text-muted-foreground">CSS @property без JavaScript.</p>
            </div>
            <div className="rounded-3xl border bg-card p-6">
              <p className="mb-3 font-semibold">Заповненість</p>
              <SeatsMeter capacity={15} seatsLeft={9} />
              <div className="h-3" />
              <SeatsMeter capacity={15} seatsLeft={2} />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Бронювання</h2>
          <p className="max-w-2xl text-muted-foreground">
            Квиток зі статусом, розбивка ціни, яку будують декоратори на сервері, і форма імітованої
            оплати.
          </p>
          <div className="flex flex-wrap gap-2">
            {(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'] as const).map((status) => (
              <BookingStatusBadge key={status} status={status} />
            ))}
          </div>
          <BookingCard booking={DEMO_BOOKING} />
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border bg-card p-6">
              <PriceBreakdown
                lines={DEMO_BOOKING.priceBreakdown}
                finalPrice={DEMO_BOOKING.finalPrice}
                pointsEarned={DEMO_BOOKING.pointsEarned}
              />
            </div>
            <PaymentForm booking={{ ...DEMO_BOOKING, status: 'PENDING' }} />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Адмінка: статистика</h2>
          <p className="max-w-2xl text-muted-foreground">
            Демо-дані. Палітра графіків — окремі токени --viz-*, перевірені на розрізнення при
            дальтонізмі й контраст для світлої та темної тем; під кожним графіком є таблиця.
          </p>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatTile label="Виторг" value="96 820 грн" hint="Без повернених оплат" />
            <StatTile label="Бронювання" value="412" />
            <StatTile label="Скасовано" value="23" />
            <StatTile label="Активні клієнти" value="138" />
            <StatTile label="Середній чек" value="235 грн" />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title="Бронювання по днях"
              subtitle="За датою створення"
              table={{
                columns: ['День', 'Бронювання', 'Скасовані'],
                rows: DEMO_DAYS.map((d) => [d.date, d.bookings, d.cancelled]),
              }}
            >
              <DailyColumns data={DEMO_DAYS} />
            </ChartCard>
            <ChartCard
              title="Виторг по днях, грн"
              table={{
                columns: ['День', 'Копійки'],
                rows: DEMO_DAYS.map((d) => [d.date, d.revenue]),
              }}
            >
              <RevenueArea data={DEMO_DAYS} />
            </ChartCard>
            <ChartCard
              title="Заповненість групових занять"
              table={{ columns: ['Центр', '%'], rows: [['SportHub Центр', 78]] }}
            >
              <MeterList
                items={[
                  { label: 'SportHub Центр', share: 0.78, detail: '312 з 400' },
                  { label: 'SportHub Сихів', share: 0.54, detail: '162 з 300' },
                  { label: 'SportHub Левандівка', share: 0.31, detail: '62 з 200' },
                ]}
              />
            </ChartCard>
            <ChartCard
              title="Популярні види спорту"
              table={{ columns: ['Вид спорту', 'Записів'], rows: [['Йога', 96]] }}
            >
              <BarList
                items={[
                  { label: 'Йога', value: 96 },
                  { label: 'Плавання', value: 74 },
                  { label: 'Фітнес', value: 51 },
                  { label: 'Бокс', value: 22 },
                ]}
              />
            </ChartCard>
            <ChartCard
              title="Клієнти за рівнем лояльності"
              table={{ columns: ['Рівень', 'Клієнтів'], rows: [['Standard', 112]] }}
            >
              <SegmentedBar
                parts={[
                  { label: 'Standard', value: 112 },
                  { label: 'Premium', value: 31 },
                  { label: 'Corporate', value: 9 },
                ]}
              />
            </ChartCard>
          </div>
          <MaintenanceButton
            initial={{
              releasedHolds: 2,
              completedBookings: 14,
              expiredMemberships: 1,
              reminders24h: 9,
              reminders2h: 4,
              startedAt: '2026-11-25T09:00:00.000Z',
              durationMs: 812,
            }}
          />
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Принципи UX</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PRINCIPLES.map(([title, text]) => (
              <div key={title} className="rounded-2xl border bg-card p-5">
                <p className="font-display font-bold">{title}</p>
                <p className="mt-2 text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
