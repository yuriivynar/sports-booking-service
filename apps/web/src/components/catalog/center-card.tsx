import { ArrowUpRight, Clock, MapPin } from 'lucide-react';
import Link from 'next/link';
import { SportIcon } from '@/components/sport-icon';
import type { CenterSummary } from '@/lib/api';
import { pluralize } from '@/lib/format';
import { MediaImage } from './media-image';

export function CenterCard({ center }: { center: CenterSummary }) {
  return (
    <article className="card-lift group relative flex h-full flex-col overflow-hidden rounded-3xl border bg-card">
      <div className="relative">
        <MediaImage
          src={center.photoUrl}
          alt=""
          icon={center.sports[0]?.icon ?? 'dumbbell'}
          sizes="(min-width: 640px) 50vw, 100vw"
          className="aspect-[16/9]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
        <div className="absolute inset-x-5 bottom-4 text-white">
          <h3 className="text-xl font-bold">
            <Link
              href={`/centers/${center.slug}`}
              className="after:absolute after:inset-0 after:rounded-3xl focus-visible:outline-none"
            >
              {center.name}
            </Link>
          </h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-white/85">
            <MapPin className="size-4" aria-hidden /> {center.address}
          </p>
        </div>
        <ArrowUpRight
          aria-hidden
          className="absolute top-4 right-4 size-9 rounded-full bg-background/85 p-2 backdrop-blur transition-transform duration-300 ease-(--ease-spring) group-hover:rotate-45"
        />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5 text-sm">
        <p className="flex items-center gap-2 text-muted-foreground">
          <Clock className="size-4 shrink-0" aria-hidden /> {center.openHour}:00–{center.closeHour}
          :00 · {pluralize(center.hallCount, ['зал', 'зали', 'залів'])} ·{' '}
          {pluralize(center.sectionCount, ['секція', 'секції', 'секцій'])}
        </p>
        <ul className="flex flex-wrap gap-2" aria-label="Види спорту">
          {center.sports.map((sport) => (
            <li
              key={sport.slug}
              className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium"
            >
              <SportIcon name={sport.icon} className="size-3.5 text-ink" />
              {sport.name}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
