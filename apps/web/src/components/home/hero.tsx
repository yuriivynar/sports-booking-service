import { ArrowRight, MapPinned } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { CountUp } from '@/components/motion/count-up';
import { Button } from '@/components/ui/button';
import { HERO_PHOTO } from '@/lib/media';

export interface HeroStats {
  centers: number;
  halls: number;
  sections: number;
  sports: number;
}

const STAT_LABELS: [keyof HeroStats, string][] = [
  ['centers', 'центри у Львові'],
  ['halls', 'залів і басейнів'],
  ['sections', 'секцій'],
  ['sports', 'видів спорту'],
];

export function Hero({ stats }: { stats: HeroStats | null }) {
  return (
    <section className="relative isolate overflow-hidden bg-stone-950 text-white">
      {HERO_PHOTO && (
        <Image
          src={HERO_PHOTO}
          alt=""
          fill
          sizes="100vw"
          loading="eager"
          fetchPriority="high"
          className="parallax -z-20 object-cover opacity-60"
        />
      )}
      {/* Readability layer and two slowly floating colour blobs. */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-stone-950 via-stone-950/80 to-stone-950/20" />
      <div
        aria-hidden
        className="absolute -top-32 -right-24 -z-10 size-[28rem] animate-float rounded-full bg-primary/40 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -bottom-40 left-1/4 -z-10 size-[24rem] animate-float rounded-full bg-electric/25 blur-3xl [animation-delay:-7s]"
      />
      <div
        aria-hidden
        className="stripes absolute right-0 bottom-0 -z-10 h-32 w-1/2 text-white/5"
      />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pt-16 pb-14 sm:pt-24 sm:pb-20">
        <p className="w-fit rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold tracking-[0.2em] uppercase backdrop-blur animate-in fade-in slide-in-from-bottom-2 duration-700">
          Мережа спортивних центрів
        </p>
        <h1 className="max-w-4xl text-4xl leading-[1.05] font-black sm:text-6xl lg:text-7xl animate-in fade-in slide-in-from-bottom-4 duration-700">
          Спорт у Львові — <span className="text-gradient">без черг і дзвінків</span>
        </h1>
        <p className="max-w-2xl text-lg text-white/75 sm:text-xl animate-in fade-in slide-in-from-bottom-4 duration-700 [animation-delay:120ms] fill-mode-backwards">
          Орендуйте зал на годину, записуйтеся на групові заняття або тренуйтеся з персональним
          тренером. За кожне бронювання — бонусні бали.
        </p>
        <div className="flex flex-wrap gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700 [animation-delay:240ms] fill-mode-backwards">
          <Button asChild size="lg">
            <Link href="/catalog">
              Знайти тренування <ArrowRight />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-white/30 bg-white/10 text-white backdrop-blur hover:bg-white/20 hover:text-white"
          >
            <Link href="/centers">
              <MapPinned /> Центри на карті
            </Link>
          </Button>
        </div>

        {stats && (
          <dl className="mt-6 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
            {STAT_LABELS.map(([key, label]) => (
              <div key={key} className="border-l-2 border-primary pl-4">
                <dt className="sr-only">{label}</dt>
                <dd className="font-display text-3xl font-black sm:text-4xl">
                  <CountUp value={stats[key]} />
                </dd>
                <dd className="text-sm text-white/65" aria-hidden>
                  {label}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}
