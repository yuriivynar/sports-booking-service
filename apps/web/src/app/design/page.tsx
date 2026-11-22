import { ArrowRight, Heart } from 'lucide-react';
import type { Metadata } from 'next';
import { Logo, LogoMark } from '@/components/brand/logo';
import { SeatsMeter } from '@/components/catalog/seats-meter';
import { PageHeader } from '@/components/layout/page-header';
import { CountUp } from '@/components/motion/count-up';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Дизайн-система' };

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
