import { BadgePercent, CalendarCheck, Coins, Crown, Search, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { ApiUnavailable } from '@/components/api-unavailable';
import { CenterCard } from '@/components/catalog/center-card';
import { MediaImage } from '@/components/catalog/media-image';
import { Hero } from '@/components/home/hero';
import { SectionHeading } from '@/components/home/section-heading';
import { SportsMarquee } from '@/components/home/sports-marquee';
import { SportIcon } from '@/components/sport-icon';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import { formatDay } from '@/lib/format';
import { cn } from '@/lib/utils';

const STEPS = [
  { icon: Search, title: 'Обирайте', text: 'Фільтруйте секції за видом спорту, рівнем і віком.' },
  {
    icon: CalendarCheck,
    title: 'Бронюйте',
    text: 'Місце в групі, зал на годину чи тренера — у кілька дотиків.',
  },
  {
    icon: Coins,
    title: 'Отримуйте бали',
    text: 'Бонуси за кожне бронювання знижують ціну наступного.',
  },
];

const TIERS = [
  { name: 'Standard', perk: 'Бонусні бали за кожне заняття', tone: 'from-stone-500 to-stone-700' },
  { name: 'Premium', perk: 'Знижки та безкоштовний басейн', tone: 'from-primary to-amber-500' },
  { name: 'Corporate', perk: 'Спеціальні умови для команд', tone: 'from-electric to-indigo-600' },
];

export default async function HomePage() {
  const api = apiClient();
  const data = await Promise.all([
    api.GET('/api/sports'),
    api.GET('/api/promotions'),
    api.GET('/api/centers'),
  ]).catch(() => null);
  const sports = data?.[0].data ?? [];
  const promotions = data?.[1].data ?? [];
  const centers = data?.[2].data ?? [];

  const stats = data
    ? {
        centers: centers.length,
        halls: centers.reduce((sum, c) => sum + c.hallCount, 0),
        sections: centers.reduce((sum, c) => sum + c.sectionCount, 0),
        sports: sports.length,
      }
    : null;

  return (
    <>
      <Hero stats={stats} />
      <SportsMarquee sports={sports} />

      <div className="mx-auto w-full max-w-6xl space-y-24 px-4 pt-20">
        {!data ? (
          <ApiUnavailable />
        ) : (
          <>
            <section>
              <SectionHeading
                eyebrow="Обери свій спорт"
                title="Види спорту"
                href="/catalog"
                linkLabel="Усі секції"
              />
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
                {sports.map((sport, index) => (
                  <Link
                    key={sport.slug}
                    href={`/catalog?sport=${sport.slug}`}
                    className={cn(
                      'card-lift reveal group relative overflow-hidden rounded-3xl border',
                      // A 2×2 first tile and a wide last tile fill the 4×3 grid exactly.
                      index === 0 && 'md:col-span-2 md:row-span-2',
                      index === sports.length - 1 && sports.length === 8 && 'md:col-span-2',
                    )}
                  >
                    <MediaImage
                      src={sport.photoUrl}
                      alt=""
                      icon={sport.icon}
                      sizes={
                        index === 0
                          ? '(min-width: 768px) 50vw, 50vw'
                          : '(min-width: 768px) 25vw, 50vw'
                      }
                      className={cn(
                        'aspect-square',
                        index === 0 && 'md:aspect-auto md:h-full',
                        index === sports.length - 1 && sports.length === 8 && 'md:aspect-[2/1]',
                      )}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                    <span className="absolute inset-x-4 bottom-4 flex items-center gap-2 font-display text-lg font-bold text-white sm:text-xl">
                      <SportIcon
                        name={sport.icon}
                        className="size-9 rounded-full bg-primary p-2 text-primary-foreground transition-transform duration-500 ease-(--ease-spring) group-hover:rotate-12"
                      />
                      {sport.name}
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            {promotions.length > 0 && (
              <section>
                <SectionHeading eyebrow="Вигідно зараз" title="Акції" />
                <div className="grid gap-4 md:grid-cols-3">
                  {promotions.map((promo, index) => (
                    <article
                      key={promo.id}
                      className={cn(
                        'card-lift reveal relative overflow-hidden rounded-3xl border p-6',
                        index === 0
                          ? 'border-transparent bg-primary text-primary-foreground'
                          : 'bg-card',
                      )}
                    >
                      <div
                        aria-hidden
                        className="stripes absolute -top-6 -right-6 size-32 opacity-15"
                      />
                      <BadgePercent className="size-7" aria-hidden />
                      <p className="mt-4 font-display text-5xl font-black">
                        −{promo.discountPercent}%
                      </p>
                      <h3 className="mt-3 text-lg font-bold">{promo.title}</h3>
                      <p
                        className={cn(
                          'mt-2 text-sm',
                          index === 0 ? 'opacity-80' : 'text-muted-foreground',
                        )}
                      >
                        {promo.description}
                      </p>
                      <p className="mt-4 text-xs font-semibold tracking-wide uppercase opacity-70">
                        До {formatDay(promo.endsAt)}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            )}

            <section>
              <SectionHeading eyebrow="Просто" title="Як це працює" />
              <ol className="grid gap-4 md:grid-cols-3">
                {STEPS.map((step, index) => (
                  <li key={step.title} className="reveal relative rounded-3xl border bg-card p-6">
                    <span className="absolute top-4 right-5 font-display text-6xl font-black text-muted">
                      {index + 1}
                    </span>
                    <step.icon
                      className="relative size-10 rounded-2xl bg-accent p-2 text-ink"
                      aria-hidden
                    />
                    <h3 className="relative mt-4 text-xl font-bold">{step.title}</h3>
                    <p className="relative mt-2 text-muted-foreground">{step.text}</p>
                  </li>
                ))}
              </ol>
            </section>

            <section>
              <SectionHeading
                eyebrow="Поруч із вами"
                title="Наші центри"
                href="/centers"
                linkLabel="Показати на карті"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                {centers.map((center) => (
                  <div key={center.slug} className="reveal">
                    <CenterCard center={center} />
                  </div>
                ))}
              </div>
            </section>

            <section className="reveal relative overflow-hidden rounded-[2.5rem] bg-stone-950 p-8 text-white sm:p-12">
              <div
                aria-hidden
                className="absolute -top-24 -right-16 size-80 animate-float rounded-full bg-primary/40 blur-3xl"
              />
              <div className="relative grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:items-center">
                <div>
                  <p className="mb-3 flex items-center gap-2 text-xs font-bold tracking-[0.2em] text-primary uppercase">
                    <Sparkles className="size-4" aria-hidden /> Програма лояльності
                  </p>
                  <h2 className="text-3xl font-extrabold sm:text-4xl">
                    Тренуйтеся більше — платіть менше
                  </h2>
                  <p className="mt-4 text-white/70">
                    Бали за кожне бронювання, а з карткою Premium — знижки та безкоштовний басейн.
                  </p>
                  <Button asChild size="lg" className="mt-6">
                    <Link href="/login">Почати зараз</Link>
                  </Button>
                </div>
                <ul className="grid gap-3 sm:grid-cols-3">
                  {TIERS.map((tier, index) => (
                    <li
                      key={tier.name}
                      className={cn(
                        'relative aspect-[1.586] overflow-hidden rounded-2xl bg-gradient-to-br p-4 shadow-lift transition-transform duration-500 ease-(--ease-spring) hover:-translate-y-2 hover:rotate-1',
                        tier.tone,
                        index === 1 && 'sm:-translate-y-3',
                      )}
                    >
                      <div aria-hidden className="stripes absolute inset-0 text-white/10" />
                      <Crown className="relative size-5" aria-hidden />
                      <p className="relative mt-3 font-display text-lg font-black">{tier.name}</p>
                      <p className="relative mt-1 text-xs text-white/85">{tier.perk}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}
